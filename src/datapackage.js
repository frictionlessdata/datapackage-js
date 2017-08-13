const fs = require('fs')
const glob = require('glob')
const lodash = require('lodash')
const {Profile} = require('./profile')
const {Resource} = require('./resource')
const helpers = require('./helpers')
const config = require('./config')


// Module API

class DataPackage {

  // Public

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  static async load(descriptor={}, {basePath, strict=false}={}) {

    // Get base path
    if (lodash.isUndefined(basePath)) {
      basePath = helpers.locateDescriptor(descriptor)
    }

    // Process descriptor
    descriptor = await helpers.retrieveDescriptor(descriptor)
    descriptor = await helpers.dereferenceDataPackageDescriptor(descriptor, basePath)

    // Get profile
    const profile = await Profile.load(
      descriptor.profile || config.DEFAULT_DATA_PACKAGE_PROFILE)

    return new DataPackage(descriptor, {basePath, strict, profile})

  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get valid() {
    return this._errors.length === 0 && this.resources.every(resource => resource.valid)
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get errors() {
    const errors = lodash.cloneDeep(this._errors)
    for (const [index, resource] of this.resources.entries()) {
      if (!resource.valid) {
        errors.push(new Error(`Resource "${resource.name || index}" validation error(s)`))
      }
    }
    return errors
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get profile() {
    return this._profile
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get descriptor() {
    // Never use this.descriptor inside this class (!!!)
    return this._nextDescriptor
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get resources() {
    return this._resources
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get resourceNames() {
    return this._resources.map(resource => resource.name)
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  addResource(descriptor) {
    if (!this._nextDescriptor.resources) this._nextDescriptor.resources = []
    this._nextDescriptor.resources.push(descriptor)
    this.commit()
    return this._resources[this._resources.length - 1]
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  getResource(name) {
    return this._resources.find(resource => resource.name === name) || null
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  removeResource(name) {
    const resource = this.getResource(name)
    if (resource) {
      const predicat = resource => resource.name !== name
      this._nextDescriptor.resources = this._nextDescriptor.resources.filter(predicat)
      this.commit()
    }
    return resource
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  async infer(pattern='**/*.csv') {

    // It's broswer
    if (config.IS_BROWSER) {
      throw new Error('Browser is not supported for infer')
    }

    // No base path
    if (!this._basePath) {
      throw new Error('Base path is required for infer')
    }

    // Add resources
    const files = await findFiles(pattern, this._basePath)
    for (const file of files) {
      this.addResource({path: file})
    }

    // Infer resources
    for (const [index, resource] of this.resources.entries()) {
      const descriptor = await resource.infer()
      this._nextDescriptor.resources[index] = descriptor
      this.commit()
    }

    return this._currentDescriptor
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  commit({strict}={}) {
    if (lodash.isBoolean(strict)) this._strict = strict
    else if (lodash.isEqual(this._currentDescriptor, this._nextDescriptor)) return false
    this._currentDescriptor = lodash.cloneDeep(this._nextDescriptor)
    this._build()
    return true
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  save(target) {
    return new Promise((resolve, reject) => {
      const contents = JSON.stringify(this._currentDescriptor, null, 4)
      fs.writeFile(target, contents, error => (!error) ? resolve() : reject(error))
    })
  }

  // Private

  constructor(descriptor, {basePath, strict, profile}={}) {

    // Handle deprecated resource.path.url
    for (const resource of (descriptor.resources || [])) {
      if (resource.url) {
        console.warn(
          `Resource property "url: <url>" is deprecated.
           Please use "path: [url]" instead (as array).`)
        resource.path = [resource.url]
        delete resource.url
      }
      if (lodash.isString(resource.path)) {
        console.warn(
          `Resource property "path: <path>" is deprecated.
           Please use "path: [path]" instead (as array).`)
        resource.path = [resource.path]
      }
    }

    // Set attributes
    this._currentDescriptor = lodash.cloneDeep(descriptor)
    this._nextDescriptor = lodash.cloneDeep(descriptor)
    this._basePath = basePath
    this._strict = strict
    this._profile = profile
    this._resources = []
    this._errors = []

    // Build package
    this._build()

  }

  _build() {

    // Process descriptor
    this._currentDescriptor = helpers.expandDataPackageDescriptor(this._currentDescriptor)
    this._nextDescriptor = lodash.cloneDeep(this._currentDescriptor)

    // Validate descriptor
    try {
      this._profile.validate(this._currentDescriptor)
      this._errors = []
    } catch (errors) {
      if (this._strict) throw errors
      this._errors = errors
    }

    // Update resources
    this._resources.length = (this._currentDescriptor.resources || []).length
    for (const [index, descriptor] of (this._currentDescriptor.resources || []).entries()) {
      const resource = this._resources[index]
      if (!resource || !lodash.isEqual(resource.descriptor, descriptor)) {
        this._resources[index] = new Resource(descriptor, {
          strict: this._strict, basePath: this._basePath,
        })
      }
    }

  }

}


// Internal

function findFiles(pattern, basePath) {
  return new Promise((resolve, reject) => {
    const options = {cwd: basePath, ignore: 'node_modules/**'}
    glob(pattern, options, (error, files) => {
      if (error) reject(error)
      resolve(files)
    })
  })
}


// System

module.exports = {
  DataPackage,
}
