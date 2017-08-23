const {Package} = require('./package')


// Module API

/**
 * https://github.com/frictionlessdata/datapackage-js#validate
 */
async function validate(descriptor) {
  const {valid, errors} = await Package.load(descriptor)
  return {valid, errors}
}


// System

module.exports = {
  validate,
}
