import fs from 'fs'
import { assert } from 'chai'
import { validate } from '../src/index'


// Tests

describe('#Validate', () => {
  describe('Using local profiles', () => {
    it('returns empty Array for valid descriptor', async () => {
      const dp1 = fs.readFileSync('data/dp1/datapackage.json', 'utf8')
      const validation = await validate(JSON.parse(dp1))

      assert(validation.length === 0)
    })

    it('returns array of errors for invalid descriptor', async () => {
      const validation = await validate({})

      assert(validation.length > 0)
    })
  })

  describe('Using remote profiles', () => {
    it('returns empty Array for valid datapackage with tabular resources', async () => {
      const dp2 = fs.readFileSync('data/dp2-tabular/datapackage.json', 'utf8')
      const validation = await validate(JSON.parse(dp2), 'tabular', true)

      assert(validation.length === 0)
    })

    it('returns Array with Errors when using wrong profile', async () => {
      const dp2 = fs.readFileSync('data/dp2-tabular/datapackage.json', 'utf8')
      const validation = await validate(JSON.parse(dp2), 'fiscal', true)

      assert(validation.length > 0)
    })

    it('returns Array of Errors when using not existing profile', async () => {
      const dp2 = fs.readFileSync('data/dp2-tabular/datapackage.json', 'utf8')
      const validation = await validate(JSON.parse(dp2), 'not-exsiting', true)

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
