const fs = require('fs')
const axios = require('axios')
const {Buffer} = require('buffer')
const pathModule = require('path')
const {Readable} = require('stream')
const pick = require('lodash/pick')
const assign = require('lodash/assign')
const isEqual = require('lodash/isEqual')
const isArray = require('lodash/isArray')
const isObject = require('lodash/isObject')
const isBoolean = require('lodash/isBoolean')
const cloneDeep = require('lodash/cloneDeep')
const isUndefined = require('lodash/isUndefined')
const S2A = require('stream-to-async-iterator').default
const {Table, Schema} = require('tableschema')
const {DataPackageError} = require('./errors')
const {Profile} = require('./profile')
const helpers = require('./helpers')
const config = require('./config')


// Module API

class Resource {

  // Public

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  static async load(descriptor={}, {basePath, strict=false}={}) {

    // Get base path
    if (isUndefined(basePath)) {
      basePath = helpers.locateDescriptor(descriptor)
    }

    // Process descriptor
    descriptor = await helpers.retrieveDescriptor(descriptor)
    descriptor = await helpers.dereferenceResourceDescriptor(descriptor, basePath)

    return new Resource(descriptor, {basePath, strict})
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get valid() {
    return this._errors.length === 0
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get errors() {
    return this._errors
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get profile() {
    return this._profile
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get descriptor() {
    // Never use this.descriptor inside this class (!!!)
    return this._nextDescriptor
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get name() {
    return this._currentDescriptor.name
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get inline() {
    return !!this._sourceInspection.inline
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get local() {
    return !!this._sourceInspection.local
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get remote() {
    return !!this._sourceInspection.remote
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get multipart() {
    return !!this._sourceInspection.multipart
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get tabular() {
    let tabular = this._currentDescriptor.profile === 'tabular-data-resource'
    if (!this._strict) tabular = tabular || this._sourceInspection.tabular
    return tabular
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get source() {
    return this._sourceInspection.source
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get headers() {
    if (!this.tabular) return null
    return this._getTable().headers
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get schema() {
    if (!this.tabular) return null
    return this._getTable().schema
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  async iter({relations=false, ...options}={}) {

    // Error for non tabular
    if (!this.tabular) {
      throw new DataPackageError('Methods iter/read are not supported for non tabular data')
    }

    // Get relations
    if (relations) {
      relations = await this._getRelations()
    }

    return await this._getTable().iter({relations, ...options})
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  async read({relations=false, ...options}={}) {

    // Error for non tabular
    if (!this.tabular) {
      throw new DataPackageError('Methods iter/read are not supported for non tabular data')
    }

    // Get relations
    if (relations) {
      relations = await this._getRelations()
    }

    return await this._getTable().read({relations, ...options})
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  async checkRelations() {
    await this.read({relations: true})
    return true
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  async rawIter({stream=false}={}) {

    // Error for inline
    if (this.inline) {
      throw new DataPackageError('Methods iter/read are not supported for inline data')
    }

    const byteStream = await createByteStream(this.source, this.remote)
    return (stream) ? byteStream : new S2A(byteStream)
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  rawRead() {
    return new Promise(resolve => {
      let bytes
      this.rawIter({stream: true}).then(stream => {
        stream.on('data', data => {bytes = (bytes) ? Buffer.concat([bytes, data]) : data})
        stream.on('end', () => resolve(bytes))
      })
    })
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  async infer() {
    const descriptor = cloneDeep(this._currentDescriptor)

    // Blank -> Stop
    if (this._sourceInspection.blank) {
      return descriptor
    }

    // Name
    if (!descriptor.name) {
      descriptor.name = this._sourceInspection.name
    }

    // Format
    if (!descriptor.format) {
      descriptor.format = this._sourceInspection.format
    }

    // Mediatype
    if (!descriptor.mediatype) {
      descriptor.mediatype = this._sourceInspection.mediatype
    }

    // Encoding
    if (descriptor.encoding === config.DEFAULT_RESOURCE_ENCODING) {
      if (!config.IS_BROWSER) {
        const jschardet = require('jschardet')
        const iterator = await this.rawIter()
        const bytes = (await iterator.next()).value
        const encoding = jschardet.detect(bytes).encoding.toLowerCase()
        descriptor.encoding = (encoding === 'ascii') ? 'utf-8' : encoding
      }
    }

    // Schema
    if (!descriptor.schema) {
      if (this.tabular) {
        descriptor.schema = await this._getTable().infer()
      }
    }

    // Profile
    if (descriptor.profile === config.DEFAULT_RESOURCE_PROFILE) {
      if (this.tabular) {
        descriptor.profile = 'tabular-data-resource'
      }
    }

    // Commit descriptor
    this._nextDescriptor = descriptor
    this.commit()

    return descriptor
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  commit({strict}={}) {
    if (isBoolean(strict)) this._strict = strict
    else if (isEqual(this._currentDescriptor, this._nextDescriptor)) return false
    this._currentDescriptor = cloneDeep(this._nextDescriptor)
    this._build()
    return true
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  save(target) {
    return new Promise((resolve, reject) => {
      const contents = JSON.stringify(this._currentDescriptor, null, 4)
      fs.writeFile(target, contents, error => (!error) ? resolve() : reject(error))
    })
  }

  // Private

  constructor(descriptor={}, {basePath, strict=false, dataPackage}={}) {

    // Handle deprecated resource.path.url
    if (descriptor.url) {
      console.warn(
        `Resource property "url: <url>" is deprecated.
         Please use "path: <url>" instead.`)
      descriptor.path = descriptor.url
      delete descriptor.url
    }

    // Set attributes
    this._currentDescriptor = cloneDeep(descriptor)
    this._nextDescriptor = cloneDeep(descriptor)
    this._dataPackage = dataPackage
    this._basePath = basePath
    this._relations = null
    this._strict = strict
    this._errors = []

    // Build resource
    this._build()

  }

  _build() {

    // Process descriptor
    this._currentDescriptor = helpers.expandResourceDescriptor(this._currentDescriptor)
    this._nextDescriptor = cloneDeep(this._currentDescriptor)

    // Inspect source
    this._sourceInspection = inspectSource(
      this._currentDescriptor.data, this._currentDescriptor.path, this._basePath)

    // Instantiate profile
    this._profile = new Profile(this._currentDescriptor.profile)

    // Validate descriptor
    this._errors = []
    const {valid, errors} = this._profile.validate(this._currentDescriptor)
    if (!valid) {
      this._errors = errors
      if (this._strict) {
        const message = `There are ${errors.length} validation errors (see 'error.errors')`
        throw new DataPackageError(message, errors)
      }
    }

    // Clear table
    this._table = null

  }

  _getTable() {
    if (!this._table) {

      // Resource -> Regular
      if (!this.tabular) {
        return null
      }

      // Resource -> Multipart
      if (this.multipart) {
        throw new DataPackageError('Resource.table does not support multipart resources')
      }

      // Resource -> Tabular
      const options = {}
      const schemaDescriptor = this._currentDescriptor.schema
      const schema = schemaDescriptor ? new Schema(schemaDescriptor) : null
      this._table = new Table(this.source, {schema, ...options})

    }
    return this._table
  }


  async _getRelations() {
    if (!this._relations) {

      // Prepare resources
      const resources = {}
      if (this._getTable() && this._getTable().schema) {
        for (const fk of this._getTable().schema.foreignKeys) {
          resources[fk.reference.resource] = resources[fk.reference.resource] || []
          for (const field of fk.reference.fields) {
            resources[fk.reference.resource].push(field)
          }
        }
      }

      // Fill relations
      this._relations = {}
      for (const [resource, fields] of Object.entries(resources)) {
        if (resource && !this._dataPackage) continue
        this._relations[resource] = this._relations[resource] || []
        const data = resource ? this._dataPackage.getResource(resource) : this
        if (data.tabular) {
          this._relations[resource] = await data.read({keyed: true})
        }
      }

    }
    return this._relations
  }

  // Deprecated

  get table() {
    return this._getTable()
  }

}


// Internal

function inspectSource(data, path, basePath) {
  const inspection = {}

  // Normalize path
  if (path && !isArray(path)) {
    path = [path]
  }

  // Blank
  if (!data && !path) {
    inspection.source = null
    inspection.blank = true

  // Inline
  } else if (data) {
    inspection.source = data
    inspection.inline = true
    inspection.tabular = isArray(data) && data.every(isObject)

  // Local/Remote
  } else if (path.length === 1) {

    // Remote
    if (helpers.isRemotePath(path[0])) {
      inspection.source = path[0]
      inspection.remote = true
    } else if (basePath && helpers.isRemotePath(basePath)) {
      inspection.source = helpers.joinUrl(basePath, path[0])
      inspection.remote = true

    // Local
    } else {

      // Path is not safe
      if (!helpers.isSafePath(path[0])) {
        throw new DataPackageError(`Local path "${path[0]}" is not safe`)
      }

      // Not base path
      if (!basePath) {
        throw new DataPackageError(`Local path "${path[0]}" requires base path`)
      }

      inspection.source = [basePath, path[0]].join('/')
      inspection.local = true
    }

    // Inspect
    inspection.format = pathModule.extname(path[0]).slice(1)
    inspection.name = pathModule.basename(path[0], `.${inspection.format}`)
    inspection.mediatype = `text/${inspection.format}`
    inspection.tabular = inspection.format === 'csv'

  // Multipart Local/Remote
  } else if (path.length > 1) {
    const inspections = path.map(item => inspectSource(null, item, basePath))
    assign(inspection, inspections[0])
    inspection.source = inspections.map(item => item.source)
    inspection.multipart = true
  }

  return inspection
}


async function createByteStream(source, remote) {
  let stream

  // Remote source
  if (remote) {
    if (config.IS_BROWSER) {
      const response = await axios.get(source)
      stream = new Readable()
      stream.push(response.data)
      stream.push(null)
    } else {
      const response = await axios.get(source, {responseType: 'stream'})
      stream = response.data
    }

  // Local source
  } else {
    if (config.IS_BROWSER) {
      throw new DataPackageError('Local paths are not supported in the browser')
    } else {
      stream = fs.createReadStream(source)
    }
  }

  return stream
}


// System

module.exports = {
  Resource,
}
