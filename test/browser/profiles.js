/* eslint-disable */

import chai from 'chai'
import _ from 'lodash'
import jsdomSetup from './jsdomSetup'

const assert = chai.assert

let Profiles
describe('Profiles', () => {

  beforeEach(() => {
    Profiles = jsdomSetup('Profiles')
  })

  describe('#retrieve', () => {
    it('returns `null` if profile ID doesn\'t exist', async() => {
      const profiles = await new Profiles(true)
      const retrieved = profiles.retrieve('inexistent-profile-id')

      assert(retrieved === null, 'Value should be null')
    })

    it('returns remote profile by its ID', async() => {
      const profiles = await new Profiles(true)
      const baseProfile = require('../../src/schemas/data-package.json')
      const retrieved = profiles.retrieve('base')

      assert.deepEqual(retrieved, baseProfile)
    })

    it('returns local profile by its ID', async() => {
      const profiles = await new Profiles(false)
      const schema = require('../../src/schemas/tabular-data-package.json')
      const retrieved = profiles.retrieve('tabular')

      assert.deepEqual(retrieved, schema)
    })
  })

  describe('#validate', () => {
    it('throw array of errors if the descriptor is invalid', async() => {
      const profiles = await new Profiles(false)

      assert(_.isArray(profiles.validate({})))
    })

    it('returns true for valid local descriptor', async() => {
      const profiles = await new Profiles(false)
      const datapackage = require('../../data/dp1/datapackage.json')

      assert(profiles.validate(datapackage) === true)
    })

    it('returns array of lint errors for invalid json string', async() => {
      const profiles = await new Profiles(false)
      const descriptor = '{"test","resources":[]}'

      assert(_.isArray(profiles.validate(descriptor)))
    })

    it('returns array of Errors for invalid string descriptor',
       async() => {
         const profiles = await new Profiles(false)
         const descriptor = '{"test": "shouldbename","resources":[]}'

         assert(_.isArray(profiles.validate(descriptor)))
       })

    it('returns true for valid data and schema passed as argument',
       async() => {
         const schema = require('../../src/schemas/tabular-data-package.json')
         const descriptor = require('../../data/dp2-tabular/datapackage.json')
         const profiles = await new Profiles(false)

         assert(profiles.validate(descriptor, schema) === true)
       })
  })

  describe('#_basePath', () => {
    it('returns null if using remote', async() => {
      const profiles = await new Profiles(true)
      const path = profiles._basePath

      assert(path === null)
    })
  })

  describe('README', () => {
    it('#Example 1', done => {
      new Profiles(true).then(profiles => {
        assert(typeof profiles.retrieve('fiscal') === 'object')
        done()
      }).catch(err => {
        done(err)
      })
    })
  })
})
