import lodash from 'lodash'
import {Profile} from './profile'
import {Resource} from './resource'
import * as helpers from './helpers'
import * as config from './config'


// Module API

export class DataPackage {

  // Public

  /**
   * Load data package
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  static async load(descriptor, {basePath, strict}={}) {

    // Get base path
    if (lodash.isUndefined(basePath)) {
      basePath = helpers.locateDescriptor(descriptor)
    }

    // Get strict
    if (lodash.isUndefined(strict)) {
      strict = true
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
   * Data package valid
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get valid() {
    return this._errors.length === 0
  }

  /**
   * Data package errors
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get errors() {
    return this._errors
  }

  /**
   * Data package errors
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get profile() {
    return this._profile
  }

  /**
   * Data package descriptor
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get descriptor() {
    // Never use this.descriptor inside this class (!!!)
    return this._nextDescriptor
  }

  /**
   * DataPackage resources
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get resources() {
    return this._resources
  }

  /**
   * DataPackage resource names
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  get resourceNames() {
    return this._resources.map(resource => resource.name)
  }

  /**
   * Add data resource
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  addResource(descriptor) {
    this._descriptor.resources.push(descriptor)
    this._nextDescriptor.resources.push(descriptor)
    this._validateDescriptor()
    if (this.valid) {
      const resource = new Resource(descriptor, {basePath: this._basePath})
      this._resources.push(resource)
      return resource
    }
    return null
  }

  /**
   * Add data resource
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  getResource(name) {
    return this._resources.find(resource => resource.name === name) || null
  }

  /**
   * Add data resource
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  removeResource(name) {
    const resource = this.getResource(name)
    if (resource) {
      const predicat = resource => resource.name !== name
      this._descriptor.resources = this._descriptor.resources.filter(predicat)
      this._nextDescriptor.resources = this._nextDescriptor.resources.filter(predicat)
      this._validateDescriptor()
      this._resources = this._resources.filter(predicat)
    }
    return resource
  }

  /**
   * Save data package descriptor
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  async save(target) {
    try {
      await helpers.writeDescriptor(this._descriptor, target)
    } catch (error) {
      throw error
    }
    return true
  }

  /**
   * Update data package
   * https://github.com/frictionlessdata/datapackage-js#datapackage
   */
  update() {
    if (lodash.isEqual(this._descriptor, this._nextDescriptor)) {
      return false
    }
    this._descriptor = lodash.cloneDeep(this._nextDescriptor)
    this._validateDescriptor()
    this._updateResources()
    return true
  }

  // Private

  constructor(descriptor, {basePath, strict, profile}={}) {

    // Process descriptor
    descriptor = helpers.expandDataPackageDescriptor(descriptor)

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
    this._nextDescriptor = lodash.cloneDeep(descriptor)
    this._descriptor = descriptor
    this._basePath = basePath
    this._strict = strict
    this._profile = profile
    this._resources = []
    this._errors = []

    // Init data package
    this._validateDescriptor()
    this._fillResources()

  }

  _validateDescriptor() {
    try {
      this._profile.validate(this._descriptor)
    } catch (errors) {
      if (this._strict) throw errors
      this._errors = errors
    }
  }

  _fillResources() {
    if (this.valid) {
      for (const descriptor of (this._descriptor.resources || [])) {
        this._resources.push(new Resource(descriptor, {basePath: this._basePath}))
      }
    }
  }

  _updateResources() {
    if (this.valid) {
      for (const [index, resource] of Object.entries(this._resources)) {
        const descriptor = this._descriptor.resources[index]
        if (!lodash.isEqual(resource.descriptor, descriptor)) {
          this._resources[index] = new Resource(descriptor, {basePath: this._basePath})
        }
      }
    }
  }

}
