const {Package} = require('./package')


// Module API

/**
 * https://github.com/frictionlessdata/datapackage-js#infer
 */
async function infer(pattern, {basePath}={}) {
  const datapackage = await Package.load({}, {basePath})
  const descriptor = await datapackage.infer(pattern)
  return descriptor
}


// System

module.exports = {
  infer,
}
