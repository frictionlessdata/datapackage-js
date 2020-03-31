const { Package } = require('./package')

// Module API

/**
 * This function is async so it has to be used with `await` keyword or as a `Promise`.
 *
 * @param {string|Object} descriptor - data package descriptor (local/remote path or object)
 * @return {Object} returns a `{valid, errors}` object
 */
async function validate(descriptor) {
  const { valid, errors } = await Package.load(descriptor)
  return { valid, errors }
}

// System

module.exports = {
  validate,
}
