import 'babel-polyfill'
import fs from 'fs'
import { assert } from 'chai'
import Util from '../src/utils'
import Profiles from '../src/profiles'


// Tests

describe('Profiles', () => {
  describe('#retrieve', () => {
    it('returns `null` if profile ID doesn\'t exist', async () => {
      const profiles = await new Profiles(true)
      const retrieved = profiles.retrieve('inexistent-profile-id')

      assert(retrieved === null, 'Value should be null')
    })

    it('returns remote profile by its ID', async () => {
      const profiles = await new Profiles(true)
      const baseProfile = fs.readFileSync('src/schemas/data-package.json', 'utf8')
      const retrieved = profiles.retrieve('base')

      assert.deepEqual(retrieved, JSON.parse(baseProfile))
    })

    it('returns local profile by its ID', async () => {
      const profiles = await new Profiles(false)
      const schema = fs.readFileSync('src/schemas/tabular-data-package.json', 'utf8')
      const retrieved = profiles.retrieve('tabular')

      assert.deepEqual(retrieved, JSON.parse(schema))
    })
  })

  describe('#validate', () => {
    it('throw array of errors if the descriptor is invalid', async () => {
      const profiles = await new Profiles(false)

      assert(profiles.validate({}) instanceof Array)
    })

    it('returns true for valid local descriptor', async () => {
      const profiles = await new Profiles(false)
      const datapackage = fs.readFileSync('data/dp1/datapackage.json', 'utf8')

      assert(profiles.validate(datapackage))
    })

    it('returns array of lint errors for invalid json string', async () => {
      const profiles = await new Profiles(false)
      const descriptor = '{"test","resources":[]}'

      assert(profiles.validate(descriptor) instanceof Array)
    })

    it('returns array of Errors for invalid string descriptor',
       async () => {
         const profiles = await new Profiles(false)
         const descriptor = '{"test": "shouldbename","resources":[]}'

         assert(profiles.validate(descriptor) instanceof Array)
       })

    it('returns true for valid data and schema passed as argument',
       async () => {
         const schema = fs.readFileSync('src/schemas/tabular-data-package.json')
         const descriptor = fs.readFileSync('data/dp2-tabular/datapackage.json', 'utf8')
         const schemaObject = JSON.parse(schema)
         const descriptorObject = JSON.parse(descriptor)
         const profiles = await new Profiles(false)

         assert(profiles.validate(descriptorObject, schemaObject) === true)
       })
  })

  describe('#_basePath', () => {
    it('returns the base path if using local', async () => {
      const profiles = await new Profiles(false)
      const path = profiles._basePath

      assert(typeof path === 'string' && !Util.isRemoteURL(path))
    })

    it('returns null if using remote', async () => {
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
