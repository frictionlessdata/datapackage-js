import _ from 'lodash'

import Resource from './resource'
import Profiles from './profiles'
import Utils from './utils'

/* Base class for working with datapackages */
class DataPackage {
  /**
   * Create a Promise that will resolve with DataPackage instance.
   *
   * @param {Object|String} descriptor - A datapackage descriptor Object or an URI string
   * @param {String} [profile='base'] - Profile to validate against
   * @param {Boolean} [raiseInvalid=true] - Throw errors if validation fails
   * @param {Boolean} [remoteProfiles=false] - Use the remote profiles
   * @return {Promise} - Resolves in class instance or rejects with errors
   */
  constructor(descriptor, profile = 'base', raiseInvalid = true
            , remoteProfiles = false) {
    const self = this

    return new Promise((resolve, reject) => {
      self._profile = profile
      self._raiseInvalid = raiseInvalid
      self._remoteProfiles = remoteProfiles

      new Profiles(self._remoteProfiles).then(profilesInstance => {
        self._Profiles = profilesInstance
        return self._loadDescriptor(descriptor)
      }).then(theDescriptor => {
        self._descriptor = theDescriptor
        const valid = this._validateDescriptor(self.descriptor, self._profile)
        if (!valid && self._raiseInvalid) {
          reject(this._errors)
        }
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
   *
   * @param {Object} newDescriptor
   * @return {true} - Resolves true if the validation passes or raiseInvalid is `true`
   * @throws {Array} - Will throw Array of Errors if validation fails when
   * raiseInvalid is `false`, or when trying to alter the `resources` property
   */
  update(newDescriptor) {
    if (this._resourcesAreSame(newDescriptor) || !this._raiseInvalid) {
      const mergedDescriptors = _.assignIn({}, this.descriptor, newDescriptor)
          , valid = this._validateDescriptor(mergedDescriptors, this._profile, this._raiseInvalid)

      if (!valid && this._raiseInvalid) {
        throw new Array(this._errors)
      }
      this._descriptor = mergedDescriptors

      return true
    }

    throw new Array(
      ['Please use the "addResource" method for altering the resources'])
  }

  /**
   * Adds new resource to the datapackage and triggers validation of the datapackage.
   * When adding a resource that is already present in the datapackage, the
   * provided resource will be omitted and the return value will be `true`
   *
   * @param descriptor {Object}
   * @returns {true}
   * @throws {Array} - Will throw Array of errors if validations fails and
   * raiseInvalid is `true` or descriptor argument is not an Object
   */
  addResource(descriptor) {
    if (_.isObject(descriptor) && !_.isFunction(descriptor)) {
      const newResource = new Resource(descriptor)
          , resourceFound = _.find(this.resources
                                 , resource => _.isEqual(resource, newResource))

      if (!resourceFound) {
        const newDescriptor = this.descriptor
            , valid = this._Profiles.validate(newDescriptor, this._profile)
        newDescriptor.resources.push(descriptor)
        if (!valid && this._raiseInvalid) {
          throw new Array(this._errors)
        }
        this._descriptor = newDescriptor
        this._resources.push(new Resource(descriptor))
        return true
      }

      return true
    }

    throw new Array(['Resource provided is not an Object'])
  }

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
        , validationError = validation instanceof Array

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
      if (newDescriptor.resources !== this.descriptor.resources) {
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
      resources.push(new Resource(resource))
    })

    return resources
  }
}

export default DataPackage
