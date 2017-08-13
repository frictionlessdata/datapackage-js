const {DataPackage} = require('./datapackage')


// Module API

/**
 * https://github.com/frictionlessdata/datapackage-js#infer
 */
async function infer(pattern, {basePath}={}) {
  const pack = new DataPackage({}, {basePath})
  const descriptor = await pack.infer(pattern)
  return descriptor
}


// System

module.exports = {
  infer,
}
