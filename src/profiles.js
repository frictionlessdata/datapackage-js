import tv4 from 'tv4'
import _ from 'lodash'
import path from 'path'
import Utils from './utils'


// Internal

const DEFAULT_REMOTE_PATH = 'http://schemas.datapackages.org/registry.csv'
let DEFAULT_LOCAL_PATH
if (!Utils.isBrowser) {
  DEFAULT_LOCAL_PATH = path.join(__dirname, 'schemas', 'registry.csv')
}


// Module API

export default class Profiles {

  // Public

  /**
   * Create a Profiles instance for working with datapackage profiles.
   *
   * @param {Boolean} [remote=false]
   * @returns {Promise}
   */
  constructor(remote = false) {
    const self = this
    const PATH = (remote || Utils.isBrowser) ? DEFAULT_REMOTE_PATH : DEFAULT_LOCAL_PATH

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
    return this._allProfiles[profile] || null
  }

  /**
   * Validate a descriptor against a profile. You can provide custom schema
   * or specify the profile id.
   *
   * @param {Object} descriptor The descriptor that needs to be validated
   * @param {Object|String} profile Schema to validate against, could be ID of a
   * profile or profile Object
   * @return {true|Array} Resolves `true` or array of strings which explain the
   *   errors.
   */
  validate(descriptor, profile = 'base') {
    function _tv4validation(data, schema) {
      if (schema === null) {
        return ['Error loading requested profile.']
      }

      const validation = tv4.validateMultiple(data, schema)
      if (validation.valid) {
        return true
      }

      return Utils.errorsToStringArray(validation.errors)
    }

    if (_.isObject(profile) && !_.isArray(profile) && !_.isFunction(profile)) {
      return _tv4validation(descriptor, profile)
    }

    return _tv4validation(descriptor, this.retrieve(profile))
  }

  // Private

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
   * Groups the passed profiles (registry) by id and returns the object.
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
