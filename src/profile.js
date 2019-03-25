const tv4 = require('tv4')
const axios = require('axios')
const isString = require('lodash/isString')
const {DataPackageError} = require('./errors')
const helpers = require('./helpers')


// Module API

class Profile {

  // Public

  /**
   * https://github.com/frictionlessdata/datapackage-js#profile
   */
  static async load(profile) {

    // Remote
    if (isString(profile) && helpers.isRemotePath(profile)) {
      let jsonschema = _cache[profile]
      if (!jsonschema) {
        try {
          const response = await axios.get(profile)
          jsonschema = response.data
        } catch (error) {
          throw new DataPackageError(`Can not retrieve remote profile "${profile}"`)
        }
        _cache[profile] = jsonschema
      }
      profile = jsonschema
    }

    return new Profile(profile)
  }

  /**
   * https://github.com/frictionlessdata/datapackage-js#profile
   */
  get name() {
    if (!this._jsonschema.title) return null
    return this._jsonschema.title.replace(' ', '-').toLowerCase()
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
    const errors = []

    // Basic validation
    const validation = tv4.validateMultiple(descriptor, this._jsonschema)
    for (const validationError of validation.errors) {
      errors.push(new Error(
        `Descriptor validation error:
        ${validationError.message}
        at "${validationError.dataPath}" in descriptor and
        at "${validationError.schemaPath}" in profile`))
    }

    return {
      valid: !errors.length,
      errors,
    }
  }

  // Private

  constructor(profile) {

    // Registry
    if (isString(profile)) {
      try {
        profile = require(`./profiles/${profile}.json`)
      } catch (error) {
        throw new DataPackageError(`Profiles registry hasn't profile "${profile}"`)
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
