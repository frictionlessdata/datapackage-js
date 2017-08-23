const fs = require('fs')
const isEqual = require('lodash/isEqual')
const isBoolean = require('lodash/isBoolean')
const cloneDeep = require('lodash/cloneDeep')
const isUndefined = require('lodash/isUndefined')
const {Profile} = require('./profile')
const {Resource} = require('./resource')
const {DataPackageError} = require('./errors')
const helpers = require('./helpers')
const config = require('./config')


// Module API

class Package {

  // Public

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
   */
  static async load(descriptor={}, {basePath, strict=false}={}) {

    // Get base path
    if (isUndefined(basePath)) {
      basePath = helpers.locateDescriptor(descriptor)
    }

    // Process descriptor
    descriptor = await helpers.retrieveDescriptor(descriptor)
    descriptor = await helpers.dereferencePackageDescriptor(descriptor, basePath)

    // Get profile
    const profile = await Profile.load(
      descriptor.profile || config.DEFAULT_DATA_PACKAGE_PROFILE)

    return new Package(descriptor, {basePath, strict, profile})

  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
   */
  get valid() {
    return this._errors.length === 0 && this.resources.every(resource => resource.valid)
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
   */
  get errors() {
    const errors = cloneDeep(this._errors)
    for (const [index, resource] of this.resources.entries()) {
      if (!resource.valid) {
        errors.push(new Error(`Resource "${resource.name || index}" validation error(s)`))
      }
    }
    return errors
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
   */
  get profile() {
    return this._profile
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
   */
  get descriptor() {
    // Never use this.descriptor inside this class (!!!)
    return this._nextDescriptor
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
   */
  get resources() {
    return this._resources
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
   */
  get resourceNames() {
    return this._resources.map(resource => resource.name)
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
   */
  getResource(name) {
    return this._resources.find(resource => resource.name === name) || null
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
   */
  addResource(descriptor) {
    if (!this._nextDescriptor.resources) this._nextDescriptor.resources = []
    this._nextDescriptor.resources.push(descriptor)
    this.commit()
    return this._resources[this._resources.length - 1]
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
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
   * https://github.com/frictionlessdata/datapackage-js#package
   */
  async infer(pattern=false) {

    // Files
    if (pattern) {

      // It's broswer
      if (config.IS_BROWSER) {
        throw new DataPackageError('Browser is not supported for pattern infer')
      }

      // No base path
      if (!this._basePath) {
        throw new DataPackageError('Base path is required for pattern infer')
      }

      // Add resources
      const files = await findFiles(pattern, this._basePath)
      for (const file of files) {
        this.addResource({path: file})
      }

    }

    // Resources
    for (const [index, resource] of this.resources.entries()) {
      const descriptor = await resource.infer()
      this._nextDescriptor.resources[index] = descriptor
      this.commit()
    }

    // Profile
    if (this._nextDescriptor.profile === config.DEFAULT_DATA_PACKAGE_PROFILE) {
      if (this.resources.length && this.resources.every(resouce => resouce.tabular)) {
        this._nextDescriptor.profile = 'tabular-data-package'
        this.commit()
      }
    }

    return this._currentDescriptor
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
   */
  commit({strict}={}) {
    if (isBoolean(strict)) this._strict = strict
    else if (isEqual(this._currentDescriptor, this._nextDescriptor)) return false
    this._currentDescriptor = cloneDeep(this._nextDescriptor)
    this._build()
    return true
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#package
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
           Please use "path: <url>" instead.`)
        resource.path = resource.url
        delete resource.url
      }
    }

    // Set attributes
    this._currentDescriptor = cloneDeep(descriptor)
    this._nextDescriptor = cloneDeep(descriptor)
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
    this._currentDescriptor = helpers.expandPackageDescriptor(this._currentDescriptor)
    this._nextDescriptor = cloneDeep(this._currentDescriptor)

    // Validate descriptor
    this._errors = []
    const {valid, errors} = this._profile.validate(this._currentDescriptor)
    if (!valid) {
      this._errors = errors
      if (this._strict) {
        const message = `There are ${errors.length} validation errors (see 'error.errors')`
        throw new DataPackageError(message, errors)
      }
    }

    // Update resources
    this._resources.length = (this._currentDescriptor.resources || []).length
    for (const [index, descriptor] of (this._currentDescriptor.resources || []).entries()) {
      const resource = this._resources[index]
      if (!resource || !isEqual(resource.descriptor, descriptor)) {
        this._resources[index] = new Resource(descriptor, {
          strict: this._strict, basePath: this._basePath, dataPackage: this,
        })
      }
    }

  }

}


// Internal

function findFiles(pattern, basePath) {
  const glob = require('glob')
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
  Package,
}
