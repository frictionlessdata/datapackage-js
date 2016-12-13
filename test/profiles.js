import 'babel-polyfill'
import { assert } from 'chai'
import fs from 'fs'

import {
  _setupBaseAndTabularRegistryMocks,
  fetchMock
} from './_mocks'

import Util from '../src/utils'
import Profiles from '../src/profiles'

describe('Profiles', () => {
  const DEFAULT_REGISTRY_URL = 'http://schemas.datapackages.org/registry.csv'

  afterEach(() => {
    fetchMock.restore()
  })

  describe('#retrieve', () => {
    beforeEach(() => {
      _setupBaseAndTabularRegistryMocks(DEFAULT_REGISTRY_URL)
    })

    it('returns undefined if profile ID doesn\'t exist', async () => {
      const profiles = await new Profiles(true)
        , retrieved = profiles.retrieve('inexistent-profile-id')

      assert(retrieved === undefined, 'Value should be undefined')
    })

    it('returns remote profile by its ID', async () => {
      const baseProfile = { title: 'base' }
        , profiles = await new Profiles(true)
        , retrieved = profiles.retrieve('base')

      assert.deepEqual(retrieved, baseProfile)
    })

    it('returns local schema by its ID', async () => {
      const profiles = await new Profiles(false)
        , schema = fs.readFileSync('schemas/tabular-data-package.json',
                                   'utf8')
        , retrieved = profiles.retrieve('tabular')

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
        , datapackage = fs.readFileSync('data/dp1/datapackage.json', 'utf8')

      assert(profiles.validate(datapackage))
    })

    it('returns true for valid string descriptor', async () => {
      const profiles = await new Profiles(false)
        , descriptor = '{"name":"test","resources":[]}'

      assert(profiles.validate(descriptor) === true)
    })

    it('returns array of lint errors for invalid json string', async () => {
      const profiles = await new Profiles(false)
        , descriptor = '{"test","resources":[]}'

      assert(profiles.validate(descriptor) instanceof Array)
    })

    it('returns array of schema errors for invalid string descriptor',
       async () => {
         const profiles = await new Profiles(false)
           , descriptor = '{"test": "shouldbename","resources":[]}'

         assert(profiles.validate(descriptor) instanceof Array)
       })

    it('returns true for valid data and schema passed as argument',
       async () => {
         const schema = fs.readFileSync('schemas/data-package.json')
            , profiles = await new Profiles(false)
            , descriptor = '{"name":"test","resources":[]}'

         assert(profiles.validate(descriptor, schema) === true)
       })
  })

  describe('#_basePath', () => {
    it('returns the base path if using local', async () => {
      const profiles = await new Profiles(false)
          , path = profiles._basePath

      assert(typeof path === 'string' && !Util.isRemoteURL(path))
    })

    it('returns null if using remote', async () => {
      const profiles = await new Profiles(true)
          , path = profiles._basePath

      assert(path === null)
    })
  })
})
