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

/**
 * Base class for retrieving profile schemas and validating datapackage
 * descriptors against profiles.
 *
 * @returns {Promise}
 */
class Profiles {
  constructor(remote = false) {
    const self = this
        , PATH = (remote || Utils.isBrowser) ? DEFAULT_REMOTE_PATH :
                 DEFAULT_LOCAL_PATH

    return new Promise((resolve, reject) => {
      this._loadRegistry(PATH).then(registry => {
        self._registry = registry
        self._basePath = Utils.getDirname(PATH)
        this._getProfiles().then(profiles => {
          self._allProfiles = profiles
          resolve(self)
        }).catch(err => {
          reject(err)
        })
      }).catch(err => {
        reject(err)
      })
    })
  }

  /**
   * Retrieve a profile by id.
   *
   * @param {String} [profile='base']
   * @return {Object}
   */
  retrieve(profile = 'base') {
    return this._allProfiles[profile]
  }

  /**
   * Validate a descriptor against a profile. You can provide custom schema
   * or specify the profile id.
   *
   * @param {String|JSON} descriptor The descriptor that needs to be validated
   * @param {String|JSON} profile Schema to validate against
   * @return {Promise} Resolves `true` or array of strings which explain the
   *   errors.
   */
  validate(descriptor, profile = 'base') {
    function _tv4validation(data, schema) {
      const validate = tv4.validateMultiple(data, schema)
      if (validate.valid) {
        return true
      }

      return Utils.errorsToStringArray(validate.errors)
    }

    let json = descriptor

    if (typeof descriptor === 'string') {
      const lint = jsonlint(descriptor)
      if (lint.error) {
        return Utils.errorsToStringArray(new Error(lint.error))
      }

      json = JSON.parse(descriptor)
    }

    if (_.isObject(profile) && !_.isArray(profile) && !_.isFunction(profile)) {
      return _tv4validation(json, profile)
    }

    return _tv4validation(json, this.retrieve(profile))
  }

  // ------ Private methods  -------

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
   * Get all profiles.
   *
   * @return {Promise}
   * @private
   */
  _getProfiles() {
    let profiles = {}
    const getProfilePromises = []

    _.forEach(this._registry, (value, key) => {
      getProfilePromises.push(this._loadProfile(value)
                                .then(res => {
                                  return { [key]: res }
                                }))
    })

    return Promise.all(getProfilePromises).then(values => {
      _.forEach(values, value => {
        profiles = _.extend(profiles, value)
      })
      return profiles
    }).catch(err => {
      throw new Error(err)
    })
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

/* eslint arrow-body-style: "off" */
