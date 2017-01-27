/* eslint-disable */

require('babel-polyfill')
var _ = require('lodash')

var Datapackage = require('./buildIndex').Datapackage
var Profiles = require('./buildIndex').Profiles
var dp1 = require('../../data/dp1/datapackage.json')

describe('Datapackage', function() {
  this.timeout(20000);
  describe('#new Datapackage', () => {
    it('initializes with Object descriptor', async () => {
      const datapackage = await new Datapackage(dp1)
      assert(_.isEqual(datapackage.descriptor, dp1),
             'Datapackage descriptor not equal the provided descriptor')
    })

    it('throws errors if raiseInvalid is true for invalid datapackage', async () => {
      let error = null

      try {
        await new Datapackage({}, 'base', true, false)
      } catch (err) {
        error = err
      }

      assert(error instanceof Array)
    })

    it('stores the errors if raiseInvalid is false for invalid datapackage',
       async () => {
         const datapackage = await new Datapackage({}, 'base', false, false)
         const errors = datapackage.errors
         const valid = datapackage.valid

         assert(valid === false, 'valid getter should report false')
         assert(errors instanceof Array && errors.length > 0)
       })
  })

  describe('#update', () => {
    it('updates the descriptor', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')

      datapackage.update({ name: 'New Name' })

      assert(datapackage.descriptor.name === 'New Name', 'Datapackage not updated')
    })

    it('throws array of errors if updating does not validate', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')

      try {
        datapackage.update({ resources: 'not array' })
        assert(false, 'Datapackage was not properly validated')
      } catch (err) {
        assert(err instanceof Array, 'Invalid rejection')
      }
    })

    it('keeps the valid descriptor if update is not successful', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')

      try {
        datapackage.update({ resources: 'not array' })
        assert(false, 'invalid descriptor updated')
      } catch (err) {
        assert(datapackage.descriptor.resources instanceof Array)
      }
    })

    it('throws array of errors if the user is altering the resources', async () => {
      const datapackage = await new Datapackage('data/dp2-tabular/datapackage.json')

      try {
        datapackage.update({ resources: [{ name: 'new resource' }] })
        assert(false, 'Updating the resources should reject')
      } catch (err) {
        assert(err instanceof Array, 'Promise not rejected with Array')
      }
    })

    it('silently adds the errors if the descriptor is invalid and if raiseInvalid is false', async () => {
      const datapackage = await new Datapackage(
        'data/dp2-tabular/datapackage.json', 'base', false)

      try {
        const validation = datapackage.update({ resources: 'not array' })
        assert(validation === false, 'Did not returned false on invalid update')
        assert(datapackage.errors.length > 0)
        assert(datapackage.valid === false, 'Datapackage should not be valid')
      } catch (err) {
        assert(false, 'Update rejected when `raiseInvalid` is set to false')
      }
    })
  })

  describe('#addResource', () => {
    it('adds resource', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')
      const validation = datapackage.addResource({ data: 'test' })

      assert(validation, `addResource returned ${typeof validation}`)
      assert(datapackage.resources.length === 2, 'Resource missing from resources getter')
      assert(datapackage.descriptor.resources[1].data === 'test', 'Test resource property not found')
    })

    it('doesn\'t add the same resource twice', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')
      const dp1 = fs.readFileSync('data/dp1/datapackage.json', 'utf8')

      try {
        datapackage.addResource(JSON.parse(dp1).resources[0])
        assert(datapackage.resources.length === 1, 'Added duplicate resource')
      } catch (err) {
        assert(false, err.join())
      }
    })

    it('rejects with Array of errors if resource is invalid', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')

      try {
        datapackage.addResource({})
      } catch (err) {
        assert(err instanceof Array, 'Rejected with non Array value')
        assert(err.length === 1, 'Array contains more errors')
      }
    })

    it('silently adds the errors and marks package as invalid when raiseInvalid is `false`', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json', 'base', false)
      const validation = datapackage.addResource({})

      assert(validation === false, 'Package not marked as invalid')
      assert(datapackage.errors.length > 0, 'Validation errors not added')
    })

    it('resource.table throws an Array of errors if resource path is illegal and raiseInvalid is true', async () => {
      const datapackage = await new Datapackage(
        'data/dp2-tabular/datapackage.json', 'tabular', false, false)
      const newResource = datapackage.resources[0]
      newResource.path = 'illegal/../../../path'
      datapackage.addResource(newResource)

      assert.throws(() => datapackage.resources[1].table, Array, /illegal/)
    })
  })

  describe('#_getBasePath', () => {
    it('returns the URL if the datapackage descriptor is URL', async () => {
      const remoteURL = 'http://bit.do/datapackage.json'
      assert(Datapackage._getBasePath(remoteURL) === remoteURL)
    })

    it('returns appended URL with explicitly provided basePath', async () => {
      const remoteURL = 'http://example.datapackage.url/datapackage.json'
      const basePath = 'datapackage/url'
      const expectedURL = 'http://example.datapackage.url/datapackage/url'
      assert(Datapackage._getBasePath(remoteURL, basePath) === expectedURL)
    })

    it('returns zero length string if provided argument is not string', () => {
      const emptyObject = {}
      assert(Datapackage._getBasePath(emptyObject) === '')
    })

    it('returns the basePath if the datapackage descriptor is Object', () => {
      const basePath = 'collected/data/'
      const expectedPath = 'collected/data/'
      assert(Datapackage._getBasePath({}, basePath) === expectedPath)
    })
  })

  describe('datapackages with remote resources', () => {
    it('loads relative resource', async () => {
      const descriptor = 'https://raw.githubusercontent.com/frictionlessdata/datapackage-js/master/data/dp1/datapackage.json'

      const datapackage = await new Datapackage(descriptor)
      const table = await datapackage.resources[0].table
      const data = await table.read()

      assert(_.isEqual(data, [['gb', 100], ['us', 200], ['cn', 300]]), 'Invalid data.')
    })

    it('loads resource from absolute URL', async () => {
      const descriptor = 'https://dev.keitaro.info/dpkjs/datapackage.json'

      const datapackage = await new Datapackage(descriptor)
      const table = await datapackage.resources[0].table
      const data = await table.read()

      assert(_.isEqual(data, [['gb', 100], ['us', 200], ['cn', 300]]), 'Invalid data.')
    })

    it('loads resource from absolute URL disregarding basePath', async () => {
      const descriptor = 'https://dev.keitaro.info/dpkjs/datapackage.json'

      const datapackage = await new Datapackage(descriptor, 'base', true, false, 'local/basePath')
      const table = await datapackage.resources[0].table
      const data = await table.read()

      assert(_.isEqual(data, [['gb', 100], ['us', 200], ['cn', 300]]), 'Invalid data.')
    })

    it('loads remote resource with basePath', async () => {
      const descriptor = 'https://dev.keitaro.info/dpkjs/datapackage.json'

      const datapackage = await new Datapackage(descriptor, 'base', true, false, 'data/')
      const table = await datapackage.resources[1].table
      const data = await table.read()

      assert(_.isEqual(data, [['gb', 105], ['us', 205], ['cn', 305]]), 'Invalid data.')
    })
  })

  describe('basePath', () => {
    const descriptor = 'data/dp1/datapackage.json'

    it('appends explicitly provided basePath to the datapackage.json path', async () => {
      const datapackage = await new Datapackage(descriptor, 'base', false, false, 'data/')
      assert(datapackage._basePath === 'data/dp1/data/', 'basePath not appended')
    })

    it('doesn\'t allow using relative parent path in basePath if explicitly provided', () => {
      new Datapackage(descriptor, 'base', true, false, 'data/../').then(() => {
        assert(false, 'Error not thrown')
      }, err => {
        assert(err instanceof Array)
        assert(err[0] = 'Found illegal \'..\' in data/../')
      })
    })

    it('doesn\'t allow using relative parent path in resource path', async () => {
      const datapackage = await new Datapackage(descriptor)
      const dp2descriptor = fs.readFileSync('data/dp2-tabular/datapackage.json', 'utf8')
      const newResource = JSON.parse(dp2descriptor).resources[0]
      newResource.path = '../dp2-tabular/data.csv'

      assert.throws(() => datapackage.addResource(newResource), Array)
    })
  })

  describe('README', () => {
    const testDatapackage = 'https://raw.githubusercontent.com/keitaroinc/datapackage-js/117584a45e6840148b8e626797e2078b51fe0d44/data/dp3-inline-data/datapackage.json'

    it('#Example', done => {
      new Datapackage(testDatapackage).then(datapackage => {
        datapackage.resources[0].table.then(table => {
          table.read().then(data => {
            assert(data, 'No data found')
            assert(datapackage.descriptor, 'Descriptor no found')
            assert(datapackage.resources.length > 0, 'Datapackage contains no resources')
            datapackage.update({ name: 'Renamed datapackage' })
            assert(datapackage.descriptor.name === 'Renamed datapackage', 'Datapackage not renamed')
            done()
          }).catch(err => {
            done(err)
          })
        })
      })
    })

    it('#Datapackage example', async done => {
      new Datapackage(testDatapackage, 'base', false).then(datapackage => {
        assert(datapackage.valid === true, 'Datapackage not valid')
        assert(!datapackage.addResource({ name: 'New Resource' }), 'Successfully added bogus resource')
        assert(datapackage.errors.length > 0, 'Errors not found')
        done()
      }).catch(err => {
        done(err)
      })
    })
  })
})

describe('Profiles', () => {
  describe('#retrieve', () => {
    it('returns `null` if profile ID doesn\'t exist', async () => {
      const profiles = await new Profiles(true)
      const retrieved = profiles.retrieve('inexistent-profile-id')

      assert(retrieved === null, 'Value should be null')
    })

    it('returns remote profile by its ID', async () => {
      const profiles = await new Profiles(true)
      const baseProfile = require('../../src/schemas/data-package.json')
      const retrieved = profiles.retrieve('base')

      assert.deepEqual(retrieved, baseProfile)
    })

    it('returns local profile by its ID', async () => {
      const profiles = await new Profiles(false)
      const schema = require('../../src/schemas/tabular-data-package.json')
      const retrieved = profiles.retrieve('tabular')

      assert.deepEqual(retrieved, schema)
    })
  })

  describe('#validate', () => {
    it('throw array of errors if the descriptor is invalid', async () => {
      const profiles = await new Profiles(false)

      assert(profiles.validate({}) instanceof Array)
    })

    it('returns true for valid local descriptor', async () => {
      const profiles = await new Profiles(false)
      const datapackage = require('../../data/dp1/datapackage.json')

      assert(profiles.validate(datapackage) === true)
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
         const schema = require('../../src/schemas/tabular-data-package.json')
         const descriptor = require('../../data/dp2-tabular/datapackage.json')
         const profiles = await new Profiles(false)

         assert(profiles.validate(descriptor, schema) === true)
       })
  })

  describe('#_basePath', () => {
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
