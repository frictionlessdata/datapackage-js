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
    let jsonschema = Profile.cache[profile]
    if (!jsonschema) {
      const isRemote = helpers.isRemotePath(profile)
      try {
        if (isRemote) {
          const response = await axios.get(profile)
          jsonschema = response.data
        } else {
          jsonschema = require(`./profiles/${profile}.json`)
        }
        Profile.cache[profile] = jsonschema
      } catch (error) {
        throw new Error(`Profile.load is not able to load profile "${profile}"`)
      }
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
    const title = this._jsonschema['title']
    if (title) {
      return title.replace(' ', '-').toLowerCase()
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

  static cache = {}

  constructor(jsonschema) {
    this._jsonschema = jsonschema
  }

}
