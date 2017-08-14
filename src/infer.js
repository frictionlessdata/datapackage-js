const {Package} = require('./package')


// Module API

/**
 * https://github.com/frictionlessdata/datapackage-js#infer
 */
async function infer(pattern, {basePath}={}) {
  const datapackage = new Package({}, {basePath})
  const descriptor = await datapackage.infer(pattern)
  return descriptor
}


// System

module.exports = {
  infer,
}
