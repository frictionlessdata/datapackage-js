import tv4 from 'tv4'
import jsonlint from 'json-lint'
import _ from 'lodash'
import path from 'path'

import Utils from './utils'

const DEFAULT_REMOTE_PATH = 'http://schemas.datapackages.org/registry.csv'
let DEFAULT_LOCAL_PATH
if (!Utils.isBrowser) {
  DEFAULT_LOCAL_PATH = path.join(__dirname, '..', 'schemas', 'registry.csv')
}

class Profiles {

  constructor(remote = false) {
    if (remote || Utils.isBrowser) {
      this._registry = this._loadRegistry(DEFAULT_REMOTE_PATH)
      this._base_path = this._loadBasePath(DEFAULT_REMOTE_PATH)
    } else {
      this._registry = this._loadRegistry(DEFAULT_LOCAL_PATH)
      this._base_path = this._loadBasePath(DEFAULT_LOCAL_PATH)
    }
  }

  // ------ Profiles methods -------

  /**
   * Retrieve a profile by id.
   *
   * @param profile
   * @return {Promise}
   */
  retrieve(profile) {
    return this._getProfile(profile)
  }

  /**
   * Validate a descriptor against a profile. You can provide custom schema
   * or specify the profile id.
   *
   * @param {String|JSON} descriptor The descriptor that needs to be validated
   * @param {String|JSON} profile Schema to validate against
   * @return {Promise} Resolves `true` or array of strings which explain the errors.
   */
  validate(descriptor, profile = 'base') {
    let json = descriptor

    if (typeof descriptor === 'string') {
      const lint = jsonlint(descriptor)

      if (lint.error) {
        return new Promise((resolve, reject) => {
          reject(Error(lint.error.toString()))
        })
      }

      json = JSON.parse(descriptor)
    }

    if (_.isObject(profile) && !_.isArray(profile) && !_.isFunction(profile)) {
      return new Promise((resolve, reject) => {
        const valid = tv4.validateMultiple(json, profile)
        if (valid) {
          resolve(valid)
        }
        reject(Error(tv4.error))
      })
    }

    return new Promise((resolve, reject) => {
      this.retrieve(profile).then(schema => {
        const validation = tv4.validateMultiple(json, schema)
        if (!validation.errors) {
          resolve(true)
        }
        reject(Utils.tv4Errors(validation.errors))
      }).catch(err => {
        reject(err)
      })
    })
  }

  // ------ Private methods related with registry ------

  /**
   * Returns all _profiles.
   *
   * @return {JSON}
   * @private
   */
  get _profiles() {
    // Returns the available _profiles' metadata.
    return this._registry
  }

  /**
   * Returns the base path.
   *
   * @return {String}
   * @private
   */
  get _basePath() {
    // If there's a Registry cache, returns its absolute base path
    return this._base_path
  }

  /**
   * Get a profile by id.
   *
   * @param {String} profileId
   * @return {Promise} Resolves in JSON if found, `undefined` if not found
   * @private
   */
  _getProfile(profileId) {
    // Return the profile with the specified ID if it exists
    return this._profiles
      .then(registry => registry[profileId])
      .then(profile => this._loadProfile(profile))
  }

  /**
   * Returns all _profiles grouped by id.
   *
   * @param pathOrURL
   * @return {Promise}
   * @private
   */
  _loadRegistry(pathOrURL) {
    return Utils.readFileOrURL(pathOrURL)
      .then(text => Utils._csvParse(text))
      .then(registry => Profiles._groupProfilesById(registry))
  }

  /** CHECHEK
   * Loads the base path (dirname) of the path.
   *
   * @param pathOrURL
   * @return {String|null}
   * @private
   */
  _loadBasePath(pathOrURL) {
    if (!Utils.isBrowser && !Utils.isRemoteURL(pathOrURL)) {
      return path.dirname(path.resolve(pathOrURL))
    }
    return null
  }

  /**
   * Loads specified profile either locally or remotely.
   *
   * @param profile
   * @return {Promise}
   * @private
   */
  _loadProfile(profile) {
    if (!profile) {
      return undefined
    }

    let profilePath

    if (!Utils.isBrowser && this._basePath && profile.schema_path) {
      profilePath = path.join(this._basePath, profile.schema_path)
    } else {
      profilePath = profile.schema
    }

    return Utils.readFileOrURL(profilePath)
      .then(text => JSON.parse(text))
  }

  /**
   * Groups the passed _profiles by id and returns the object.
   *
   * @param registry
   * @return {Object}
   * @private
   */
  static _groupProfilesById(registry) {
    const groupedRegistry = {}

    _.forEach(registry, profile => {
      groupedRegistry[profile.id] = profile
    })

    return groupedRegistry
  }
}

export default Profiles
