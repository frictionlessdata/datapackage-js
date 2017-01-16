import url from 'url'
import _ from 'lodash'
import path from 'path'
import jts from 'jsontableschema'

import Utils from './utils'

// Module API

export default class Resource {

  // Public

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
   * Returns the location type of the data. Possible values are 'inline', 'remote'
   * and 'local'.
   *
   * @returns {String}
   */
  get type() {
    if (this._sourceKey === 'data') {
      return 'inline'
    }

    const source = this.descriptor[this._sourceKey]
    if (typeof source === 'string') {
      const protocol = url.parse(source).protocol
      if (_.includes(this.REMOTE_PROTOCOLS, protocol)) {
        return 'remote'
      }
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
    const source = this.descriptor[this._sourceKey]

    if (this._sourceKey === 'path' && this._basePath
        && !Utils.isRemoteURL(source)) {

      if (Utils.isRemoteURL(this._basePath)) {
        return url.resolve(this._basePath, source)
      }

      return path.normalize(`${this._basePath}/${source}`)
    }

    return source
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

  // Private

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
