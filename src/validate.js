import {Profile} from './profile'
import * as helpers from './helpers'


// Module API

/**
 * Validate datapackage descriptor
 * https://github.com/frictionlessdata/datapackage-js#validate
 */
export async function validate(descriptor) {

  // Get base path
  const basePath = helpers.locateDescriptor(descriptor)

  // Process descriptor
  descriptor = await helpers.retrieveDescriptor(descriptor)
  descriptor = await helpers.dereferenceDataPackageDescriptor(descriptor, basePath)
  descriptor = helpers.expandDataPackageDescriptor(descriptor)

  // Get descriptor profile
  const profile = await Profile.load(descriptor.profile)

  // Validate descriptor
  return profile.validate(descriptor)

}
