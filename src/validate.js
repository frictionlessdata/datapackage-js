const {Profile} = require('./profile')
const helpers = require('./helpers')


// Module API

/**
 * https://github.com/frictionlessdata/datapackage-js#validate
 */
async function validate(descriptor) {

  // Get base path
  const basePath = helpers.locateDescriptor(descriptor)

  // Process descriptor
  descriptor = await helpers.retrieveDescriptor(descriptor)
  descriptor = await helpers.dereferencePackageDescriptor(descriptor, basePath)
  descriptor = helpers.expandPackageDescriptor(descriptor)

  // Get descriptor profile
  const profile = await Profile.load(descriptor.profile)

  // Validate descriptor
  return profile.validate(descriptor)

}


// System

module.exports = {
  validate,
}
