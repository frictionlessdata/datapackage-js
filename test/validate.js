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
    let errors
    const descriptor = {resource: [{name: 'name'}]}
    try {await validate(descriptor)} catch (e) {errors = e}
    assert.deepEqual(errors.length, 1)
  })

})
