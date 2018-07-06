const axios = require('axios')
const {assert} = require('chai')
const {catchError} = require('./helpers')
const AxiosMock = require('axios-mock-adapter')
const {Profile} = require('../src/profile')


// Constants

const PROFILES = [
  'data-package',
  'tabular-data-package',
  'fiscal-data-package',
  'data-resource',
  'tabular-data-resource',
]


// Tests

describe('Profile', () => {

  describe('#load', () => {
    let http

    beforeEach(() => {http = new AxiosMock(axios)})
    afterEach(() => {http.restore()})

    PROFILES.forEach(name => {
      it(`load registry "${name}" profile`, async () => {
        const jsonschema = require(`../src/profiles/${name}.json`)
        const profile = await Profile.load(name)
        assert.deepEqual(profile.jsonschema, jsonschema)
      })
    })

    it('load remote profile', async () => {
      const url = 'http://example.com/data-package.json'
      const jsonschema = require('../src/profiles/data-package.json')
      http.onGet(url).reply(200, jsonschema)
      const profile = await Profile.load(url)
      assert.deepEqual(profile.name, 'data-package')
      assert.deepEqual(profile.jsonschema, jsonschema)
    })

    it('throw loading bad registry profile', async () => {
      const name = 'bad-data-package'
      const error = await catchError(Profile.load, name)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'profile "bad-data-package"')
    })

    it('throw loading bad remote profile', async () => {
      const name = 'http://example.com/profile.json'
      http.onGet(name).reply(400)
      const error = await catchError(Profile.load, name)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'Can not retrieve remote')
    })

  })

  describe('#validate', () => {

    it('returns true for valid descriptor', async () => {
      const descriptor = {resources: [{name: 'name', data: ['data']}]}
      const profile = await Profile.load('data-package')
      assert.isOk(profile.validate(descriptor))
    })

    it('errors for invalid descriptor', async () => {
      const descriptor = {}
      const profile = await Profile.load('data-package')
      const {valid, errors} = profile.validate(descriptor)
      assert.deepEqual(valid, false)
      assert.instanceOf(errors[0], Error)
      assert.include(errors[0].message, 'Missing required property')
    })

  })

  // TODO: recover https://github.com/frictionlessdata/specs/issues/616
  describe.skip('#up-to-date', () => {

    PROFILES.forEach(name => {
      it(`profile ${name} should be up-to-date`, async function() {
        if (process.env.USER_ENV === 'browser') this.skip()
        if (process.env.TRAVIS_BRANCH !== 'master') this.skip()
        const profile = await Profile.load(name)
        const response = await axios.get(`https://specs.frictionlessdata.io/schemas/${name}.json`)
        assert.deepEqual(profile.jsonschema, response.data)
      })
    })

  })

})
