import tv4 from 'tv4'
import axios from 'axios'
import * as helpers from './helpers'


// Module API

export class Profile {

  // Public

  /**
   * Load profile class
   * https://github.com/frictionlessdata/datapackage-js#profile
   */
  static async load(profile) {
    let jsonschema = Profile._cache[profile]
    if (!jsonschema) {

      // Remote
      if (helpers.isRemotePath(profile)) {
        try {
          const response = await axios.get(profile)
          jsonschema = response.data
        } catch (error) {
          throw new Error(`Can not retrieve remote profile "${profile}"`)
        }

      // Local
      } else {
        try {
          jsonschema = require(`./profiles/${profile}.json`)
        } catch (error) {
          throw new Error(`Profiles registry hasn't profile "${profile}"`)
        }
      }

      Profile._cache[profile] = jsonschema
    }
    return new Profile(jsonschema)
  }

  /**
   * Profile name
   * https://github.com/frictionlessdata/datapackage-js#profile
   */
  get name() {
    // TODO: rebase on jsonschema.spec property when available:
    // https://github.com/frictionlessdata/specs/issues/399#issuecomment-291116945
    if (this._jsonschema.title) {
      return this._jsonschema.title.replace(' ', '-').toLowerCase()
    }
    return null
  }

  /**
   * Profile jsonschema
   * https://github.com/frictionlessdata/datapackage-js#profile
   */
  get jsonschema() {
    return this._jsonschema
  }

  /**
   * Validate descriptor
   * https://github.com/frictionlessdata/datapackage-js#profile
   */
  validate(descriptor) {
      const validation = tv4.validateMultiple(descriptor, this._jsonschema)
      if (!validation.valid) {
        const errors = []
        for (const error of validation.errors) {
          errors.push(new Error(`Descriptor validation error: ${error.message}`))
        }
        throw errors
      }
      return true
  }

  // Private

  static _cache = {}

  constructor(jsonschema) {
    this._jsonschema = jsonschema
  }

}
