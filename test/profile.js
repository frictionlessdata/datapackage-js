import chai from 'chai'
import axios from 'axios'
import lodash from 'lodash'
import AxiosMock from 'axios-mock-adapter'
import {Profile} from '../src/profile'
const should = chai.should()


// Constants

const PROFILES = [
  'data-package',
  'tabular-data-package',
  'fiscal-data-package',
]


// Tests

describe('Profile', () => {
  let http

  beforeEach(() => {http = new AxiosMock(axios)})
  afterEach(() => {http.restore()})

  describe('#load', () => {

    PROFILES.forEach(name => {
      it(`load registry "${name}" profile`, async () => {
        const jsonschema = require(`../src/profiles/${name}.json`)
        const profile = await Profile.load(name)
        profile.jsonschema.should.be.deep.equal(jsonschema)
      })
    })

    it('load remote profile', async () => {
      const url = 'http://example.com/data-package.json'
      const jsonschema = require('../src/profiles/data-package.json')
      http.onGet(url).reply(200, jsonschema)
      const profile = await Profile.load(url)
      profile.name.should.be.equal('data-package')
      profile.jsonschema.should.be.deep.equal(jsonschema)
    })

    it('throw loading bad registry profile', async () => {
      let error
      const name = 'bad-data-package'
      try {await Profile.load(name)} catch (e) {error = e}
      should.exist(error)
    })

    it('throw loading bad remote profile', async () => {
      let error
      const name = 'http://example.com/profile.json'
      http.onGet(name).reply(400)
      try {await Profile.load(name)} catch (e) {error = e}
      should.exist(error)
    })

  })

  describe('#validate', () => {

    it('returns true for valid descriptor', async () => {
      const descriptor = {resources: [{name: 'name', data: ['data']}]}
      const profile = await Profile.load('data-package')
      profile.validate(descriptor).should.be.true
    })

    it('raises errors for invalid descriptor', async () => {
      let errors
      const descriptor = {resources: [{name: 'name'}]}
      const profile = await Profile.load('data-package')
      try {await profile.validate(descriptor)} catch (e) {errors = e}
      should.exist(errors)
    })

  })

})
