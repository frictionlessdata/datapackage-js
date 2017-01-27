import tv4 from 'tv4'
import _ from 'lodash'
import path from 'path'
import Utils from './utils'

// Internal

const DEFAULT_REMOTE_PATH = 'https://schemas.frictionlessdata.io/registry.json'
let DEFAULT_LOCAL_PATH = 'registry'
if (!Utils.isBrowser) {
  DEFAULT_LOCAL_PATH = path.join(__dirname, 'schemas', 'registry.json')
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
    self._remote = remote
    const PATH = remote ? DEFAULT_REMOTE_PATH : DEFAULT_LOCAL_PATH

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
   * @return {Array} Empty array or array of errors found
   *
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
    return this._loadFile(pathOrURL)
      .then(text => JSON.parse(text))
      .then(registry => {
        const profiles = {}
        for (const key of Object.keys(registry)) {
          let name = null
          if (key === 'datapackage') name = 'base'
          if (key.endsWith('-datapackage')) name = key.replace('-datapackage', '')
          if (name) {
            profiles[name] = registry[key]
          }
        }
        return profiles
      })
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

    if (Utils.isBrowser) {
      profilePath = profile.schema_path.split('.')[0]
    } else if (this._basePath && profile.schema_path) {
      profilePath = path.join(this._basePath, profile.schema_path)
    } else {
      profilePath = profile.schema
    }

    return this._loadFile(profilePath)
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
   * Wrapper function around Utils.readFileOrURL for handling bundled profiles if
   * remote is set to `false` and running in the browser.
   *
   * @param filePath
   * @return {Promise}
   * @private
   */
  _loadFile(filePath) {
    if (Utils.isRemoteURL(filePath)) {
      return Utils.readFileOrURL(filePath)
    }

    if (Utils.isBrowser) {
      return new Promise((resolve, reject) => {
        try {
          // Dynamic require for webpack to bundle all json files from ./schemas
          // so they can be required in the browser
          resolve(JSON.stringify(require('./schemas/' + filePath + '.json')))
        } catch (err) {
          reject(err)
        }
      })
    }

    return Utils.readFileOrURL(filePath)
  }
}

/* eslint import/no-dynamic-require: off, prefer-template: off */
