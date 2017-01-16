import _ from 'lodash'
import path from 'path'
import Utils from './utils'
import Resource from './resource'
import Profiles from './profiles'


// Module API

export default class DataPackage {

  // Public

  /**
   * Returns a Promise that will resolve in Datapackage instance.
   *
   * @param {Object|String} descriptor - A datapackage descriptor Object or an URI string
   * @param {Object|String} [profile='base'] - Profile to validate against
   * @param {Boolean} [raiseInvalid=true] - Throw errors if validation fails
   * @param {Boolean} [remoteProfiles=false] - Use remote profiles
   * @param {String|path} [basePath=null] - Base path for the resources. If the provided
   * descriptor is a local path to a file, the default value is the dirname of the path.
   * @return {Promise} - Resolves in class instance or rejects with errors
   */
  constructor(descriptor, profile = 'base', raiseInvalid = true,
    remoteProfiles = false, basePath) {

    const self = this

    return new Promise((resolve, reject) => {
      self._profile = profile
      self._raiseInvalid = raiseInvalid
      self._remoteProfiles = remoteProfiles
      self._basePath = basePath || self._getBasePath(descriptor)

      new Profiles(self._remoteProfiles).then(profilesInstance => {
        self._Profiles = profilesInstance
        return self._loadDescriptor(descriptor)
      }).then(theDescriptor => {
        self._descriptor = theDescriptor
        const valid = self._validateDescriptor(self.descriptor, self._profile)
        if (self._shouldRaise(valid)) reject(this._errors)
        self._resources = self._loadResources(self.descriptor)

        resolve(self)
      }).catch(err => {
        reject(err)
      })
    })
  }

  /**
   * Get datapackage validity
   *
   * @return {Boolean}
   */
  get valid() {
    return this._valid
  }

  /**
   * Get the errors
   *
   * @return {Array}
   */
  get errors() {
    return this._errors || []
  }

  /**
   * Get the datapackage descriptor
   *
   * @return {Object}
   */
  get descriptor() {
    return this._descriptor
  }

  /**
   * Get the datapacka Resources
   *
   * @return {[Resource]}
   */
  get resources() {
    return this._resources
  }

  /**
   * Updates the current descriptor with the properties of the provided Object.
   * New properties are added and existing properties are replaced.
   * Note: it doesn't do deep merging, it just adds/replaces top level properties
   *
   * @param {Object} newDescriptor
   * @return {Boolean} - Returns validation status of the package
   * @throws {Array} - Will throw Array of Errors if validation fails when
   * raiseInvalid is `false`, or when trying to alter the `resources` property
   */
  update(newDescriptor) {
    if (this._resourcesAreSame(newDescriptor) || !this._raiseInvalid) {
      const mergedDescriptors = _.assignIn({}, this.descriptor, newDescriptor)
      const valid = this._validateDescriptor(mergedDescriptors, this._profile)

      if (this._shouldRaise(valid)) throw new Array(this._errors)
      this._descriptor = mergedDescriptors

      return this._valid
    }

    throw new Array(
      ['Please use the "addResource" method for altering the resources'])
  }

  /**
   * Adds new resource to the datapackage and triggers validation of the datapackage.
   * When adding a resource that is already present in the datapackage, the
   * provided resource will be omitted and the return value will be `true`.
   *
   * @param descriptor {Object}
   * @returns {Boolean} - Returns validation status of the package
   * @throws {Array} - Will throw Array of errors if validations fails and
   * raiseInvalid is `true` or descriptor argument is not an Object
   */
  addResource(descriptor) {
    if (_.isObject(descriptor) && !_.isFunction(descriptor)) {
      const newResource = new Resource(descriptor, this._basePath)
      const resourceFound = _.find(
        this.resources, resource => _.isEqual(resource, newResource))

      if (!resourceFound) {
        const newDescriptor = this.descriptor
        newDescriptor.resources.push(descriptor)
        const valid = this._validateDescriptor(newDescriptor, this._profile)
        if (this._shouldRaise(valid)) throw new Array(this._errors)
        this._descriptor = newDescriptor
        this._resources.push(new Resource(descriptor, this._basePath))

        return this.valid
      }

      return true
    }

    throw new Array(['Resource provided is not an Object'])
  }

  // Private

  /**
   * Validate the datapackage descriptor
   *
   * @param {Object} descriptor
   * @param {Object|String} profile
   * @returns {Boolean}
   * @private
   */
  _validateDescriptor(descriptor, profile) {
    const validation = this._Profiles.validate(descriptor, profile)
    const validationError = validation instanceof Array

    this._errors = validationError ? validation : []
    this._valid = !validationError

    return this._valid
  }

  /**
   * Load the provided descriptor
   *
   * @param descriptor
   * @return {Promise}
   * @private
   */
  _loadDescriptor(descriptor) {
    const theDescriptor = descriptor
    if (typeof theDescriptor === 'string') {
      return new Promise((resolve, reject) => {
        Utils.readFileOrURL(theDescriptor).then(res => {
          resolve(JSON.parse(res))
        }).catch(err => {
          reject(err)
        })
      })
    }

    return Promise.resolve(theDescriptor)
  }

  /**
   * Check if the provided descriptor has da same resources property as the
   * current descriptor
   *
   * @param newDescriptor
   * @return {Boolean}
   * @private
   */
  _resourcesAreSame(newDescriptor) {
    if (newDescriptor.resources) {
      if (_.isEqual(newDescriptor.resources, this.descriptor.resources)) {
        return false
      }
    }

    return true
  }

  /**
   * Load resources from descriptor returning Array of Resource objects
   *
   * @param descriptor
   * @return {[Resource]}
   * @private
   */
  _loadResources(descriptor) {
    const resources = []

    _.forEach(descriptor.resources, resource => {
      resources.push(new Resource(resource, this._basePath))
    })

    return resources
  }

  /**
   * Returns true if errors should be raised depending on the validation result
   * and the state of this._raiseInvalid
   *
   * @param valid
   * @return {Boolean}
   * @private
   */
  _shouldRaise(valid) {
    return !valid && this._raiseInvalid
  }

  /**
   * Returns the basepath from the path of the current descriptor if it is a
   * local path, or the URL if the datapackage was loaded via URL.
   *
   * @param {String} descriptor
   * @return {String|null}
   * @private
   */
  _getBasePath(descriptor) {
    if (typeof descriptor === 'string') {
      if (!Utils.isRemoteURL(descriptor)) {
        return path.dirname(descriptor)
      }

      return descriptor
    }

    return null
  }
}
