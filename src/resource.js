const fs = require('fs')
const axios = require('axios')
const lodash = require('lodash')
const {Buffer} = require('buffer')
const jschardet = require('jschardet')
const pathModule = require('path')
const {Readable} = require('stream')
const S2A = require('stream-to-async-iterator').default
const {Table, Schema} = require('tableschema')
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
    if (lodash.isUndefined(basePath)) {
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
  get table() {

    // Resource -> Regular
    if (!this.tabular) {
      return null
    }

    // Resource -> Multipart
    if (this.multipart) {
      throw new Error('Resource.table does not support multipart resources')
    }

    // Resource -> Tabular
    if (!this._table) {
      const schemaDescriptor = this._currentDescriptor.schema
      const schema = schemaDescriptor ? new Schema(this._currentDescriptor.schema) : null
      this._table = new Table(this.source, {schema})
    }

    return this._table

  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  async infer() {
    const descriptor = lodash.cloneDeep(this._currentDescriptor)

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
      const iterator = await this.iter()
      const bytes = (await iterator.next()).value
      const encoding = jschardet.detect(bytes).encoding.toLowerCase()
      descriptor.encoding = (encoding === 'ascii') ? 'utf-8' : encoding
    }

    // Schema
    if (!descriptor.schema) {
      if (this.tabular) {
        descriptor.schema = await this.table.infer()
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
    if (lodash.isBoolean(strict)) this._strict = strict
    else if (lodash.isEqual(this._currentDescriptor, this._nextDescriptor)) return false
    this._currentDescriptor = lodash.cloneDeep(this._nextDescriptor)
    this._build()
    return true
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  async iter({stream=false}={}) {
    const byteStream = await createByteStream(this.source, this.remote)
    return (stream) ? byteStream : new S2A(byteStream)
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  read() {
    return new Promise(resolve => {
      let bytes
      this.iter({stream: true}).then(stream => {
        stream.on('data', data => {bytes = (bytes) ? Buffer.concat([bytes, data]) : data})
        stream.on('end', () => resolve(bytes))
      })
    })
  }

  // Private

  constructor(descriptor={}, {basePath, strict=false}={}) {

    // Set attributes
    this._currentDescriptor = lodash.cloneDeep(descriptor)
    this._nextDescriptor = lodash.cloneDeep(descriptor)
    this._basePath = basePath
    this._strict = strict
    this._errors = []

    // Build resource
    this._build()

  }

  _build() {

    // Process descriptor
    this._currentDescriptor = helpers.expandResourceDescriptor(this._currentDescriptor)
    this._nextDescriptor = lodash.cloneDeep(this._currentDescriptor)

    // Inspect source
    this._sourceInspection = inspectSource(
      this._currentDescriptor.data, this._currentDescriptor.path, this._basePath)

    // Instantiate profile
    this._profile = new Profile(this._currentDescriptor.profile)

    // Validate descriptor
    try {
      this._profile.validate(this._currentDescriptor)
      this._errors = []
    } catch (errors) {
      if (this._strict) throw errors
      this._errors = errors
    }

    // Clear table
    this._table = null

  }

}


// Internal

function inspectSource(data, path, basePath) {
  const descriptor = {}

  // Normalize path
  if (path && !lodash.isArray(path)) {
    path = [path]
  }

  // Blank
  if (!data && !path) {
    descriptor.source = null
    descriptor.blank = true

  // Inline
  } else if (data) {
    descriptor.source = data
    descriptor.inline = true
    descriptor.tabular = lodash.isArray(data) && data.every(lodash.isObject)

  // Local/Remote
  } else if (path.length === 1) {

    // Remote
    if (helpers.isRemotePath(path[0])) {
      descriptor.source = path[0]
      descriptor.remote = true
    } else if (basePath && helpers.isRemotePath(basePath)) {
      descriptor.source = helpers.joinUrl(basePath, path[0])
      descriptor.remote = true

    // Local
    } else {
      if (!helpers.isSafePath(path[0])) {
        throw new Error(`Local path "${path[0]}" is not safe`)
      }
      if (!basePath) {
        throw new Error(`Local path "${path[0]}" requires base path`)
      }
      descriptor.source = [basePath, path[0]].join('/')
      descriptor.local = true
    }

    // Inspect
    descriptor.format = pathModule.extname(path[0]).slice(1)
    descriptor.name = pathModule.basename(path[0], `.${descriptor.format}`)
    descriptor.mediatype = `text/${descriptor.format}`
    descriptor.tabular = descriptor.format === 'csv'

  // Multipart Local/Remote
  } else if (path.length > 1) {
    const descriptors = path.map(item => inspectSource(null, item, basePath))
    lodash.assign(descriptor, descriptors[0])
    descriptor.source = descriptors.map(item => item.source)
    descriptor.multipart = true
  }

  return descriptor
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
      throw new Error('Local paths are not supported in the browser')
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
