import fs from 'fs'
import { assert } from 'chai'
import _ from 'lodash'
import jsdomSetup from './jsdomSetup'

// Tests

describe('#Validate', () => {

  let validate,
    dp1,
    dp2

  beforeEach(() => {
    validate = jsdomSetup('validate')
    dp1 = JSON.parse(fs.readFileSync('./data/dp1/datapackage.json', 'utf8'))
    dp2 = JSON.parse(fs.readFileSync('./data/dp2-tabular/datapackage.json', 'utf8'))
  })

  describe('Using local profiles', () => {
    it('returns true for valid descriptor', async () => {
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
      const validation = await validate(dp2, 'tabular', true)

      assert(validation === true)
    })

    it('returns Array with Errors when using wrong profile', async () => {
      const validation = await validate(dp2, 'fiscal', true)

      assert(validation.length > 0)
    })

    it('returns Array of Errors when using not existing profile', async () => {
      const validation = await validate(dp2, 'not-exsiting', true)

      assert(validation[0] === 'Error loading requested profile.')
    })
  })

  describe('README', () => {
    it('#Example 1', done => {
      validate({ name: 'Invalid Datapackage' }).then(validation => {
        if (_.isArray(validation)) {
          assert(validation.length > 0, 'No errors present')
          done()
        }
      })
    })
  })
})
