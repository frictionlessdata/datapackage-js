import _ from 'lodash'

import validate from './validate'
import Resource from './resource'
import Utils from './utils'

/* Base class for working with datapackages */
class DataPackage {
  /**
   * Create a Promise that will resolve with DataPackage instance.
   *
   * @param {Object} descriptor - a datapackage descriptor
   * @param {String} [profile='base']
   * @param {Boolean} [raiseInvalid=true]
   * @param {Boolean} [remoteProfiles=false]
   * @return {Promise} - Resolves in class instance
   */
  constructor(descriptor, profile = 'base', raiseInvalid = true
            , remoteProfiles = false) {
    const self = this

    return new Promise((resolve, reject) => {
      self._profile = profile
      self._raiseInvalid = raiseInvalid
      self._remoteProfiles = remoteProfiles

      this._loadDescriptor(descriptor).then(theDescriptor => {
        self._descriptor = theDescriptor
        return self._validateDescriptor(self._descriptor
                                      , profile
                                      , raiseInvalid
                                      , remoteProfiles)
      }).then(validation => {
        self._validationErrors(validation)
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
   * @param newDescriptor {Object}
   * @return {Promise} Resolves in true or rejects with Array of errors
   */
  update(newDescriptor) {
    // Check if altering resources but ignore if raiseInvalid is false
    if (this._resourcesAreSame(newDescriptor) || !this._raiseInvalid) {
      let mergedDescriptors

      return new Promise((resolve, reject) => {
        this._loadDescriptor(newDescriptor).then(theDescriptor => {
          mergedDescriptors = _.extend({}, this.descriptor, theDescriptor)
          return this._validateDescriptor(mergedDescriptors,
                                          this._profile,
                                          this._raiseInvalid,
                                          this._remoteProfiles)
        }).then(validation => {
          this._descriptor = mergedDescriptors
          this._validationErrors(validation)

          resolve(true)
        }).catch(err => {
          reject(err)
        })
      })
    }

    return Promise.reject(
      ['You have tried to alter the `resources` property. Please use the `addResource` method.'])
  }

  /**
   * Adds new resource to the datapackage and triggers validation of the datapackage.
   * When adding a resource that is already present in the datapackage, the
   * provided resource will be omitted and the Promise will resolve with `true`.
   *
   * @param descriptor {Object}
   * @return {Promise} Resolves in `true` or rejects with Array of errors
   */
  addResource(descriptor) {
    if (_.isObject(descriptor) && !_.isFunction(descriptor)) {
      const newResource = new Resource(descriptor)
        , found = _.find(this.resources, resource => _.isEqual(resource, newResource))

      if (!found) {
        const newDescriptor = this.descriptor
        newDescriptor.resources.push(descriptor)

        return new Promise((resolve, reject) => {
          validate(newDescriptor, this._profile, this._remoteProfiles).then(res => {
            if (res === true) {
              this._descriptor = newDescriptor
              this._resources.push(new Resource(descriptor))
              resolve(true)
            }

            reject(res)
          })
        })
      }

      return Promise.resolve(true)
    }

    return Promise.reject(['Resource provided is not an Object'])
  }

  /**
   * Validate the datapackage descriptor
   *
   * @param descriptor
   * @param profile
   * @param raiseInvalid
   * @param remoteProfiles
   * @return {Promise}
   * @private
   */
  _validateDescriptor(descriptor, profile, raiseInvalid, remoteProfiles) {
    return new Promise((resolve, reject) => {
      validate(descriptor, profile, remoteProfiles).then(validation => {
        if (validation instanceof Array) {
          if (raiseInvalid) {
            reject(validation)
          }
        }
        resolve(validation)
      })
    })
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
   * Parse the validation output and populate _errors and _valid
   *
   * @param validation
   * @private
   */
  _validationErrors(validation) {
    const validationError = validation instanceof Array
    this._errors = validationError ? validation : []
    this._valid = !(validationError)
  }

  /**
   * Check if the provided descriptor has da same resources property as the
   * current descriptor
   *
   * @param newDescriptor
   * @return {boolean}
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
