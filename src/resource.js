'use strict'

import url from 'url'
import jts from 'jsontableschema'
import _ from 'lodash'

export default class Resource {

  constructor(descriptor) {
    this._descriptor = descriptor
    this.REMOTE_PROTOCOLS = ['http:', 'https:', 'ftp:', 'ftps:']
  }

  getDescriptor() {
    return this._descriptor
  }

  getName() {
    return this.getDescriptor()['name']
  }

  getType() {
    const resourceField = this._getResourceField()

    if (resourceField === 'data') {
      return 'inline'
    }

    const protocol = url.parse(this.getDescriptor()[resourceField])['protocol']
    if (_.includes(this.REMOTE_PROTOCOLS, protocol)) {
      return 'remote'
    } else {
      return 'local'
    }

  }

  getSource() {
    return this.getDescriptor()[this._getResourceField()]
  }

  getTable() {
    const resourceField = this._getResourceField()
    return new jts.Table(this.getDescriptor()['schema'],
                         this.getDescriptor()[resourceField])
  }

  _getResourceField() {
    const inlineData = this.getDescriptor()['data']
    const path = this.getDescriptor()['path']

    if (inlineData) {
      return 'data'
    } else {
      return 'path'
    }
  }
}