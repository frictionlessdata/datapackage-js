const {Package} = require('./package')


// Module API

/**
 * https://github.com/frictionlessdata/datapackage-js#infer
 */
async function infer(pattern, {basePath}={}) {
  const dataPackage = await Package.load({}, {basePath})
  const descriptor = await dataPackage.infer(pattern)
  return descriptor
}


// System

module.exports = {
  infer,
}
