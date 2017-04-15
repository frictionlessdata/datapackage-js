import { assert } from 'chai'
import validate from '../src/validate'


// Tests

describe('#Validate', () => {
  describe('Using local profiles', () => {
    it('returns true for valid descriptor', async () => {
      const dp1 = require('../data/dp1/datapackage.json')
      const validation = await validate(dp1)

      assert(validation === true)
    })

    it('returns array of errors for invalid descriptor', async () => {
      const validation = await validate({})

      assert(validation.length > 0)
    })
  })

  describe('Using remote profiles', () => {
    it('returns true for valid datapackage with tabular resources', async () => {
      const dp2 = require('../data/dp2-tabular/datapackage.json')
      const validation = await validate(dp2, 'tabular', true)

      assert(validation === true)
    })

    it('returns Array with Errors when using wrong profile', async () => {
      const dp2 = require('../data/dp2-tabular/datapackage.json')
      const validation = await validate(dp2, 'fiscal', true)

      assert(validation.length > 0)
    })

    it('returns Array of Errors when using not existing profile', async () => {
      const dp2 = require('../data/dp2-tabular/datapackage.json')
      const validation = await validate(dp2, 'not-exsiting', true)

      assert(validation[0] === 'Error loading requested profile.')
    })
  })

  describe('README', () => {
    it('#Example 1', done => {
      validate({ name: 'Invalid Datapackage' }).then(validation => {
        if (validation instanceof Array) {
          assert(validation.length > 0, 'No errors present')
          done()
        }
      })
    })
  })
})
