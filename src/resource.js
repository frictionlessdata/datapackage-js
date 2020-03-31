const fs = require('fs')
const axios = require('axios')
const { Buffer } = require('buffer')
const pathModule = require('path')
const urljoin = require('url-join')
const { Readable } = require('stream')
const assign = require('lodash/assign')
const isEqual = require('lodash/isEqual')
const isArray = require('lodash/isArray')
const isObject = require('lodash/isObject')
const isBoolean = require('lodash/isBoolean')
const cloneDeep = require('lodash/cloneDeep')
const isUndefined = require('lodash/isUndefined')
const S2A = require('stream-to-async-iterator').default
const { Table, Schema } = require('tableschema')
const { DataPackageError } = require('./errors')
const { Profile } = require('./profile')
const helpers = require('./helpers')
const config = require('./config')

// Module API

/**
 * Resource representation
 */
class Resource {
  // Public

  /**
   * Factory method to instantiate `Resource` class.
   *
   * This method is async and it should be used with await keyword or as a `Promise`.
   *
   * @param {string|Object} descriptor - resource descriptor as local path, url or object
   * @param {string} basePath - base path for all relative paths
   * @param {boolean} strict - strict flag to alter validation behavior.
   *   Setting it to `true` leads to throwing errors on
   *   any operation with invalid descriptor
   * @throws {DataPackageError} raises error if something goes wrong
   * @returns {Resource} returns resource class instance
   */
  static async load(descriptor = {}, { basePath, strict = false } = {}) {
    // Get base path
    if (isUndefined(basePath)) {
      basePath = helpers.locateDescriptor(descriptor)
    }

    // Process descriptor
    descriptor = await helpers.retrieveDescriptor(descriptor)
    descriptor = await helpers.dereferenceResourceDescriptor(descriptor, basePath)

    return new Resource(descriptor, { basePath, strict })
  }

  /**
   * Validation status
   *
   * It always `true` in strict mode.
   *
   * @returns {Boolean} returns validation status
   */
  get valid() {
    return this._errors.length === 0
  }

  /**
   * Validation errors
   *
   * It always empty in strict mode.
   *
   * @returns {Error[]} returns validation errors
   */
  get errors() {
    return this._errors
  }

  /**
   * Profile
   *
   * @returns {Profile}
   */
  get profile() {
    return this._profile
  }

  /**
   * Descriptor
   *
   * @returns {Object} schema descriptor
   */
  get descriptor() {
    // Never use this.descriptor inside this class (!!!)
    return this._nextDescriptor
  }

  /**
   * Name
   *
   * @returns {string}
   */
  get name() {
    return this._currentDescriptor.name
  }

  /**
   * Whether resource is inline
   *
   * @returns {boolean}
   */
  get inline() {
    return !!this._sourceInspection.inline
  }

  /**
   * Whether resource is local
   *
   * @returns {boolean}
   */
  get local() {
    return !!this._sourceInspection.local
  }

  /**
   * Whether resource is remote
   *
   * @returns {boolean}
   */
  get remote() {
    return !!this._sourceInspection.remote
  }

  /**
   * Whether resource is multipart
   *
   * @returns {boolean}
   */
  get multipart() {
    return !!this._sourceInspection.multipart
  }

  /**
   * Whether resource is tabular
   *
   * @returns {boolean}
   */
  get tabular() {
    if (this._currentDescriptor.profile === 'tabular-data-resource') return true
    if (!this._strict) {
      if (config.TABULAR_FORMATS.includes(this._currentDescriptor.format)) return true
      if (this._sourceInspection.tabular) return true
    }
    return false
  }

  /**
   * Source
   *
   * Combination of `resource.source` and `resource.inline/local/remote/multipart`
   * provides predictable interface to work with resource data.
   *
   * @returns {Array|string}
   */
  get source() {
    return this._sourceInspection.source
  }

  /**
   * Headers
   *
   * > Only for tabular resources
   *
   * @returns {string[]} data source headers
   */
  get headers() {
    if (!this.tabular) return null
    return this._getTable().headers
  }

  /**
   * Schema
   *
   * > Only for tabular resources
   *
   * @returns {tableschema.Schema}
   */
  get schema() {
    if (!this.tabular) return null
    return this._getTable().schema
  }

  /**
   * Iterate through the table data
   *
   * > Only for tabular resources
   *
   * And emits rows cast based on table schema (async for loop).
   * With a `stream` flag instead of async iterator a Node stream will be returned.
   * Data casting can be disabled.
   *
   * @param {boolean} keyed - iter keyed rows
   * @param {boolean} extended - iter extended rows
   * @param {boolean} cast - disable data casting if false
   * @param {boolean} forceCast - instead of raising on the first row with cast error
   *   return an error object to replace failed row. It will allow
   *   to iterate over the whole data file even if it's not compliant to the schema.
   *   Example of output stream:
   *     `[['val1', 'val2'], TableSchemaError, ['val3', 'val4'], ...]`
   * @param {boolean} relations - if true foreign key fields will be
   *   checked and resolved to its references
   * @param {boolean} stream - return Node Readable Stream of table rows
   * @throws {TableSchemaError} raises any error occurred in this process
   * @returns {(AsyncIterator|Stream)} async iterator/stream of rows:
   *  - `[value1, value2]` - base
   *  - `{header1: value1, header2: value2}` - keyed
   *  - `[rowNumber, [header1, header2], [value1, value2]]` - extended
   */
  async iter({ relations = false, ...options } = {}) {
    // Error for non tabular
    if (!this.tabular) {
      throw new DataPackageError('Methods iter/read are not supported for non tabular data')
    }

    // Get relations
    if (relations) {
      relations = await this._getRelations()
    }

    return await this._getTable().iter({ relations, ...options })
  }

  /**
   * Read the table data into memory
   *
   * > Only for tabular resources; the API is the same as `resource.iter` has except for:
   *
   * @param {integer} limit - limit of rows to read
   * @returns {(Array[]|Object[])} list of rows:
   *  - `[value1, value2]` - base
   *  - `{header1: value1, header2: value2}` - keyed
   *  - `[rowNumber, [header1, header2], [value1, value2]]` - extended
   */
  async read({ relations = false, ...options } = {}) {
    // Error for non tabular
    if (!this.tabular) {
      throw new DataPackageError('Methods iter/read are not supported for non tabular data')
    }

    // Get relations
    if (relations) {
      relations = await this._getRelations()
    }

    return await this._getTable().read({ relations, ...options })
  }

  /**
   * It checks foreign keys and raises an exception if there are integrity issues.
   *
   * > Only for tabular resources
   *
   * @throws {DataPackageError} raises if there are integrity issues
   * @returns {boolean} returns True if no issues
   */
  async checkRelations() {
    await this.read({ relations: true })
    return true
  }

  /**
   * Iterate over data chunks as bytes. If `stream` is true Node Stream will be returned.
   *
   * @param {boolean} stream - Node Stream will be returned
   * @returns {Iterator|Stream} returns Iterator/Stream
   */
  async rawIter({ stream = false } = {}) {
    // Error for inline
    if (this.inline) {
      throw new DataPackageError('Methods iter/read are not supported for inline data')
    }

    const byteStream = await createByteStream(this.source, this.remote)
    return stream ? byteStream : new S2A(byteStream)
  }

  /**
   * Returns resource data as bytes.
   *
   * @returns {Buffer} returns Buffer with resource data
   */
  rawRead() {
    return new Promise((resolve) => {
      let bytes
      this.rawIter({ stream: true }).then((stream) => {
        stream.on('data', (data) => {
          bytes = bytes ? Buffer.concat([bytes, data]) : data
        })
        stream.on('end', () => resolve(bytes))
      })
    })
  }

  /**
   * Infer resource metadata like name, format, mediatype, encoding, schema and profile.
   *
   * It commits this changes into resource instance.
   *
   * @returns {Object} returns resource descriptor
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

    // Only for non inline
    if (!this.inline) {
      // Format
      if (!descriptor.format) {
        descriptor.format = this._sourceInspection.format
      }

      // Mediatype
      if (!descriptor.mediatype) {
        descriptor.mediatype = `text/${descriptor.format}`
      }

      // Encoding
      if (descriptor.encoding === config.DEFAULT_RESOURCE_ENCODING) {
        if (!config.IS_BROWSER) {
          const jschardet = require('jschardet')
          const iterator = await this.rawIter()
          const bytes = (await iterator.next()).value
          const encoding = jschardet.detect(bytes).encoding.toLowerCase()
          descriptor.encoding = encoding === 'ascii' ? 'utf-8' : encoding
        }
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

    // Save descriptor
    this._currentDescriptor = descriptor
    this._build()

    return descriptor
  }

  /**
   * Update resource instance if there are in-place changes in the descriptor.
   *
   * @param {boolean} strict - alter `strict` mode for further work
   * @throws DataPackageError raises error if something goes wrong
   * @returns {boolean} returns true on success and false if not modified
   */
  commit({ strict } = {}) {
    if (isBoolean(strict)) this._strict = strict
    else if (isEqual(this._currentDescriptor, this._nextDescriptor)) return false
    this._currentDescriptor = cloneDeep(this._nextDescriptor)
    this._table = null
    this._build()
    return true
  }

  /**
   * Save resource to target destination.
   *
   * > For now only descriptor will be saved.
   *
   * @param {string} target - path where to save a resource
   * @throws {DataPackageError} raises error if something goes wrong
   * @returns {boolean} returns true on success
   */
  save(target) {
    return new Promise((resolve, reject) => {
      const contents = JSON.stringify(this._currentDescriptor, null, 4)
      fs.writeFile(target, contents, (error) => (!error ? resolve() : reject(error)))
    })
  }

  // Private

  constructor(descriptor = {}, { basePath, strict = false, dataPackage } = {}) {
    // Handle deprecated resource.path.url
    if (descriptor.url) {
      console.warn(
        `Resource property "url: <url>" is deprecated.
         Please use "path: <url>" instead.`
      )
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
      this._currentDescriptor.data,
      this._currentDescriptor.path,
      this._basePath
    )

    // Instantiate profile
    this._profile = new Profile(this._currentDescriptor.profile)

    // Validate descriptor
    this._errors = []
    const { valid, errors } = this._profile.validate(this._currentDescriptor)
    if (!valid) {
      this._errors = errors
      if (this._strict) {
        const message = `There are ${errors.length} validation errors (see 'error.errors')`
        throw new DataPackageError(message, errors)
      }
    }
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
      const descriptor = this._currentDescriptor
      options.format = descriptor.format || 'csv'
      options.encoding = descriptor.encoding
      const dialect = descriptor.dialect
      if (dialect) {
        if (dialect.header === false || config.DEFAULT_DIALECT.header === false) {
          const fields = (descriptor.schema || {}).fields || []
          options.headers = fields.length ? fields.map((field) => field.name) : null
        }
        helpers.validateDialect(dialect)
        for (const key of DIALECT_KEYS) {
          if (dialect[key]) options[key.toLowerCase()] = dialect[key]
        }
      }
      const schemaDescriptor = this._currentDescriptor.schema
      const schema = schemaDescriptor ? new Schema(schemaDescriptor) : null
      this._table = new Table(this.source, { schema, ...options })
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
      for (const [resource] of Object.entries(resources)) {
        if (resource && !this._dataPackage) continue
        this._relations[resource] = this._relations[resource] || []
        const data = resource ? this._dataPackage.getResource(resource) : this
        if (data.tabular) {
          this._relations[resource] = await data.read({ keyed: true })
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

const DIALECT_KEYS = [
  'delimiter',
  'doubleQuote',
  'lineTerminator',
  'quoteChar',
  'escapeChar',
  'skipInitialSpace',
]

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
      inspection.source = urljoin(basePath, path[0])
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
    inspection.tabular = config.TABULAR_FORMATS.includes(inspection.format)

    // Multipart Local/Remote
  } else if (path.length > 1) {
    const inspections = path.map((item) => inspectSource(null, item, basePath))
    assign(inspection, inspections[0])
    inspection.source = inspections.map((item) => item.source)
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
      const response = await axios.get(source, { responseType: 'stream' })
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
