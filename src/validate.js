import Profiles from './profiles'

const PROFILES_CACHED = {}

/**
 * Standalone function for validating datapackage descriptor against a profile.
 * It encapsulates the Profiles class and exposes only validation. Profile
 * promises are cached and the class will not be initialized on every call.
 *
 * @param {Object} descriptor
 * @param {Object|String} profile
 * @param {Boolean} remoteProfiles
 * @return {Promise} Resolves `true` or Array of errors.
 */
export default function validate(descriptor
                               , profile = 'base'
                               , remoteProfiles = false) {
  const remoteString = remoteProfiles.toString()

  if (PROFILES_CACHED[remoteString]) {
    return new Promise((resolve, reject) => {
      PROFILES_CACHED[remoteString].then(profiles => {
        resolve(profiles.validate(descriptor, profile))
      }).catch(err => {
        reject(err)
      })
    })
  }

  PROFILES_CACHED[remoteString] = new Profiles(remoteProfiles)

  return new Promise((resolve, reject) => {
    PROFILES_CACHED[remoteString].then(profiles => {
      resolve(profiles.validate(descriptor, profile))
    }).catch(err => {
      reject(err)
    })
  })
}
