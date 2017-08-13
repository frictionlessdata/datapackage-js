const tv4 = require('tv4')
const axios = require('axios')
const lodash = require('lodash')
const helpers = require('./helpers')


// Module API

class Profile {

  // Public

  /**
   * https://github.com/frictionlessdata/datapackage-js#profile
   */
  static async load(profile) {

    // Remote
    if (lodash.isString(profile) && helpers.isRemotePath(profile)) {
      let jsonschema = _cache[profile]
      if (!jsonschema) {
        try {
          const response = await axios.get(profile)
          jsonschema = response.data
        } catch (error) {
          throw new Error(`Can not retrieve remote profile "${profile}"`)
        }
        _cache[profile] = jsonschema
        profile = jsonschema
      }
    }

    return new Profile(profile)
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#profile
   */
  get name() {
    if (this._jsonschema.title) {
      return this._jsonschema.title.replace(' ', '-').toLowerCase()
    }
    return null
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#profile
   */
  get jsonschema() {
    return this._jsonschema
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#profile
   */
  validate(descriptor) {
    const validation = tv4.validateMultiple(descriptor, this._jsonschema)
    if (!validation.valid) {
      const errors = []
      for (const error of validation.errors) {
        errors.push(new Error(
          `Descriptor validation error:
          ${error.message}
          at "${error.dataPath}" in descriptor and
          at "${error.schemaPath}" in profile`))
      }
      throw errors
    }
    return true
  }

  // Private

  constructor(profile) {

    // Registry
    if (lodash.isString(profile)) {
      try {
        profile = require(`./profiles/${profile}.json`)
      } catch (error) {
        throw new Error(`Profiles registry hasn't profile "${profile}"`)
      }
    }

    this._jsonschema = profile
  }

}


// Internal

const _cache = {}


// System

module.exports = {
  Profile,
}
