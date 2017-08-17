const {assert} = require('chai')
const {validate} = require('../src')


// Tests

describe('validate', () => {

  it('returns true for valid descriptor', async () => {
    const descriptor = {resources: [{name: 'name', data: ['data']}]}
    const valid = await validate(descriptor)
    assert.ok(valid)
  })

  it('returns array of errors for invalid descriptor', async () => {
    const descriptor = {resource: [{name: 'name'}]}
    const {valid, errors} = await validate(descriptor)
    assert.deepEqual(valid, false)
    assert.deepEqual(errors.length, 1)
  })

})
