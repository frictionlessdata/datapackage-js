'use strict'

import url from 'url'
import jts from 'jsontableschema'
import _ from 'lodash'

export default class Resource {

  constructor(descriptor) {
    this._descriptor = descriptor
    this.REMOTE_PROTOCOLS = ['http:', 'https:', 'ftp:', 'ftps:']
  }

  get descriptor() {
    return this._descriptor
  }

  get name() {
    return this.descriptor['name']
  }

  get type() {
    const resourceField = this._getSourceKey()

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

  get source() {
    return this.descriptor[this._getSourceKey()]
  }

  get table() {
    const resourceField = this._getSourceKey()
    return new jts.Table(this.descriptor['schema'],
                         this.descriptor[resourceField])
  }

  _getSourceKey() {
    const inlineData = this.descriptor['data']
    const path = this.descriptor['path']

    if (inlineData) {
      return 'data'
    } else {
      return 'path'
    }
  }
}