const { Package } = require('./package')

// Module API

/**
 * This function is async so it has to be used with `await` keyword or as a `Promise`.
 *
 * @param {string} pattern - glob file pattern
 * @returns {Object} returns data package descriptor
 */
async function infer(pattern, { basePath } = {}) {
  const dataPackage = await Package.load({}, { basePath })
  const descriptor = await dataPackage.infer(pattern)
  return descriptor
}

// System

module.exports = {
  infer,
}
