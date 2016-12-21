import url from 'url'
import jts from 'jsontableschema'
import _ from 'lodash'
import path from 'path'

/* Base class for all Data Package's resource types. */
export default class Resource {
  /**
   * Create a Resource instance.
   *
   * @param {Object} descriptor
   * @param {String} [basePath=null]
   */
  constructor(descriptor, basePath = null) {
    this._descriptor = descriptor
    this._basePath = basePath
    this.REMOTE_PROTOCOLS = ['http:', 'https:', 'ftp:', 'ftps:']
  }

  /**
   * Returns the descriptor that was used to initialize the class.
   *
   * @returns {*}
   */
  get descriptor() {
    return this._descriptor
  }

  /**
   * Returns the name in the descriptor.
   *
   * @returns {String}
   */
  get name() {
    return this.descriptor.name
  }

  /**
   * Returns the location of the data. Possible values are 'inline', 'remote'
   * and 'local'.
   *
   * @returns {String}
   */
  get type() {
    const resourceField = this._sourceKey
        , protocol = url.parse(this.descriptor[resourceField]).protocol

    if (resourceField === 'data') {
      return 'inline'
    }

    if (_.includes(this.REMOTE_PROTOCOLS, protocol)) {
      return 'remote'
    }

    return 'local'
  }

  /**
   * Returns the path where data is located or
   * if the data is inline it returns the actual data.
   * If the source is a path, the basepath is prepended
   * if provided on Resource initialization.
   *
   * @returns {String|Array|Object}
   */
  get source() {
    if (this._sourceKey === 'path' && this._basePath) {
      const resourcePath = this.descriptor[this._sourceKey]
      return path.normalize(`${this._basePath}/${resourcePath}`)
    }

    return this.descriptor[this._sourceKey]
  }

  /**
   * Initializes the jsontableschema.Table class with the provided descriptor.
   * If data is not tabular or schema is not defined or not valid the promise
   * resolves to `null`
   *
   * See https://github.com/frictionlessdata/jsontableschema-js#table
   *
   * @returns {Promise}
   */
  get table() {
    if (!this._table) {
      this._table = new Promise(resolve => {
        new jts.Table(this.descriptor.schema, this.source).then(res => {
          resolve(res)
        }).catch(() => {
          resolve(null)
        })
      })
    }
    return this._table
  }

  /**
   * Private function used to identify if the descriptor contains inline data
   * or provides a path for the data.
   *
   * @returns {String}
   * @private
   */
  get _sourceKey() {
    const inlineData = this.descriptor.data

    if (inlineData) {
      return 'data'
    }

    return 'path'
  }
}
