import url from 'url'
import path from 'path'
import jts from 'tableschema'

import Utils from './utils'

// Module API

export default class Resource {

  // Public

  /**
   * Create a Resource instance.
   *
   * @param {Object} descriptor
   * @param {String} [basePath='']
   */
  constructor(descriptor, basePath = '') {
    this._descriptor = descriptor
    this._basePath = basePath
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
      if (Utils.isRemoteURL(source)) {
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

    if (!source) {
      // Neither inline data nor path available
      return null

    } else if (this.type === 'inline') {
      // Data is inline
      return source

    } else if (this._sourceKey === 'path' && this._basePath === '') {
      // Local or remote path, no basePath provided
      if (this._validPaths) {
        return source
      }
    } else if (this._sourceKey === 'path' && this._basePath !== '') {
      // basePath needs to be prepended

      // we need to check the validity of the paths here because one can use
      // only the Resource class to read file contents with `table`
      if (this._validPaths) {
        if (Utils.isRemoteURL(this._basePath)) {
          // basePath is remote URL
          // in case when `source` is an absolute url, url.resolve returns only `source`

          return url.resolve(this._basePath, source)

        }
        // basePath is local
        return path.join(this._basePath, source)
      }
    }
  }

  /**
   * Initializes the jsontableschema.Table class with the provided descriptor.
   * If data is not tabular or schema is not defined or not valid the promise
   * resolves to `null`
   *
   * See https://github.com/frictionlessdata/jsontableschema-js#table
   *
   * @returns {Promise}
   * @throws Array if resource path or basePath are not valid
   */
  get table() {
    if (this._validPaths) {
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

    throw new Array(['Can\'t initialize table because resource path or ' +
                     'basePath contain invalid characters. Please see ' +
                     'https://specs.frictionlessdata.io/data-packages/#data-location'])
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

  /**
   * Check if resource path and basePath are valid
   *
   * @return {true}
   * @throws Array of errors if the resource path or basePath is not valid
   * @private
   */
  get _validPaths() {
    if (typeof this._valid !== 'undefined') {
      return this._valid
    }

    if (this._sourceKey === 'path') {
      Resource._validatePath(this._basePath)
      Resource._validatePath(this.descriptor[this._sourceKey])
      // If nothing is thrown by _.validatePath resource is marked as valid if
      // late reference is needed
      this._valid = true

      return this._valid
    }

    // Data is inline
    this._valid = true

    return this._valid
  }

  /**
   * Throws an Error if path is invalid or returns true
   *
   * @param {String} resourcePath
   * @return {true}
   * @throws Array of errors if the resource path or basePath is not valid
   * @private
   */
  static _validatePath(resourcePath) {
    const pathErrors = Utils.checkPath(resourcePath)
    const pathValid = pathErrors.length === 0
    if (!pathValid) {
      throw pathErrors
    }

    return true
  }
}

/* eslint consistent-return: off */
