const {assert} = require('chai')
const helpers = require('../src/helpers')


// Tests

describe.only('helpers', () => {

  [ // path, isSafe
    ['data.csv', true],
    ['data/data.csv', true],
    ['data/country/data.csv', true],
    ['data\\data.csv', true],
    ['data\\country\\data.csv', true],
    ['../data.csv', false],
    ['~/data.csv', false],
    ['~invalid_user/data.csv', false],
    ['%userprofile%', false],
    ['%unknown_windows_var%', false],
    ['$HOME', false],
    ['$UNKNOWN_VAR', false],
  ].forEach(test => {
    const [path, isSafe] = test
    it(`#isSafePath: ${path} -> ${isSafe}`, async () => {
      assert.deepEqual(helpers.isSafePath(path), isSafe)
    })
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
