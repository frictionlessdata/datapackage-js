const lodash = require('lodash')
const {Table} = require('tableschema')
const helpers = require('./helpers')


// Module API

class Resource {

  // Public

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  static async load(descriptor, {basePath}={}) {

    // Get base path
    if (lodash.isUndefined(basePath)) {
      basePath = helpers.locateDescriptor(descriptor)
    }

    // Process descriptor
    descriptor = await helpers.retrieveDescriptor(descriptor)
    descriptor = await helpers.dereferenceResourceDescriptor(descriptor, basePath)

    return new Resource(descriptor, {basePath})
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get name() {
    return this.descriptor.name
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get tabular() {
    return this.descriptor.profile === 'tabular-data-resource'
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get descriptor() {
    return this._descriptor
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get sourceType() {
    return this._sourceType
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#resource
   */
  get source() {
    return this._source
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
    if (this.sourceType.startsWith('multipart')) {
      throw new Error('Resource.table does not support multipart resources')
    }

    // Resource -> Tabular
    if (!this._table) {
      this._table = new Table(this.descriptor.schema, this.source)
    }

    // TODO: after tableschema fix this method should be sync (!!!)
    // but for now it returns Promise
    return this._table

  }

  // Private

  constructor(descriptor, {basePath}={}) {

    // Process descriptor
    descriptor = helpers.expandResourceDescriptor(descriptor)

    // Get source/source type
    const [source, sourceType] = _getSourceWithType(
      descriptor.data, descriptor.path, basePath)

    // Set attributes
    this._sourceType = sourceType
    this._descriptor = descriptor
    this._basePath = basePath
    this._source = source

  }

}


// Internal

function _getSourceWithType(data, path, basePath) {
  let source
  let sourceType

  // Inline
  if (data) {
    source = data
    sourceType = 'inline'

  // Local/Remote
  } else if (path.length === 1) {
    if (helpers.isRemotePath(path[0])) {
      source = path[0]
      sourceType = 'remote'
    } else if (basePath && helpers.isRemotePath(basePath)) {
      source = helpers.joinUrl(basePath, path[0])
      sourceType = 'remote'
    } else {
      if (!helpers.isSafePath(path[0])) {
        throw new Error(`Local path "${path[0]}" is not safe`)
      }
      if (!basePath) {
        throw new Error(`Local path "${path[0]}" requires base path`)
      }
      // TODO: support not only Unix
      source = [basePath, path[0]].join('/')
      sourceType = 'local'
    }

  // Multipart Local/Remote
  } else if (path.length > 1) {
    source = []
    sourceType = 'multipart-local'
    for (const chunkPath of path) {
      const [chunkSource, chunkSourceType] = _getSourceWithType(
        null, [chunkPath], basePath)
      source.push(chunkSource)
      if (chunkSourceType === 'remote') {
        sourceType = 'multipart-remote'
      }
    }
  }

  return [source, sourceType]

}


module.exports = {
  Resource,
}
