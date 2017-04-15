import chai from 'chai'
import {validate} from '../src/validate'
const should = chai.should()


// Tests

describe('validate', () => {

  it('returns true for valid descriptor', async () => {
    const descriptor = {resources: [{name: 'name', data: ['data']}]}
    const valid = await validate(descriptor)
    valid.should.be.true
  })

  it('returns array of errors for invalid descriptor', async () => {
    let errors
    const descriptor = {resource: [{name: 'name'}]}
    try {await validate(descriptor)} catch (e) {errors = e}
    should.exist(errors)
    errors.should.have.length(1)
  })

})
