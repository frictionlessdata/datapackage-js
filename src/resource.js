'use strict'

import url from 'url'
import jts from 'jsontableschema'
import _ from 'lodash'

/**
 * Base class for all Data Package's resource types.
 *
 * @returns {Resource}
 */
export default class Resource {

  constructor(descriptor) {
    this._descriptor = descriptor
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
    return this.descriptor['name']
  }

  /**
   * Returns the location of the data. Possible values are 'inline', 'remote'
   * and 'local'.
   *
   * @returns {String}
   */
  get type() {
    const resourceField = this._sourceKey

    if (resourceField === 'data') {
      return 'inline'
    }

    const protocol = url.parse(this.descriptor[resourceField])['protocol']
    if (_.includes(this.REMOTE_PROTOCOLS, protocol)) {
      return 'remote'
    } else {
      return 'local'
    }

  }

  /**
   * Returns the path where data is located or
   * if the data is inline it returns the actual data
   *
   * @returns {String|Array|Object}
   */
  get source() {
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
    return new Promise((resolve, reject) => {
      new jts.Table(this.descriptor['schema'], this.source).then((res) => {
        resolve(res)
      }).catch(() => {
        reject(null)
      })
    })
  }

  /**
   * Private function used to identify if the descriptor contains inline data
   * or provides a path for the data.
   *
   * @returns {String}
   * @private
   */
  get _sourceKey() {
    const inlineData = this.descriptor['data']
    const path = this.descriptor['path']

    if (inlineData) {
      return 'data'
    } else {
      return 'path'
    }
  }
}
