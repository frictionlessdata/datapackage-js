const {assert} = require('chai')
const {helpers} = require('../src/helpers')


// Tests

describe('helpers', () => {

  it('#isSafePath', async function() {
  })

})


// Helpers

async function catchError(func, ...args) {
  let error
  try {
    await func(...args)
  } catch (exception) {
    error = exception
  }
  return error
}


// System

module.exports = {
  catchError,
}
