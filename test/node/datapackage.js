import 'babel-polyfill'
import fs from 'fs'
import { assert } from 'chai'
import _ from 'lodash'
import parse from 'csv-parse/lib/sync'
import { Datapackage } from '../../src/index'


// Tests

describe('node: Datapackage', () => {
  describe('#new Datapackage', () => {
    it('initializes with Object descriptor', async () => {
      const dp1 = fs.readFileSync('data/dp1/datapackage.json', 'utf8')
      const datapackage = await new Datapackage(JSON.parse(dp1))
      assert(_.isEqual(datapackage.descriptor, JSON.parse(dp1)),
          'Datapackage descriptor not equal the provided descriptor')
    })

    it('initializes with URL descriptor', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')
      const dp1 = fs.readFileSync('data/dp1/datapackage.json', 'utf8')

      assert(_.isEqual(datapackage.descriptor, JSON.parse(dp1)),
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

    it('changes the datapackage attribute when resources are the same', async () => {
      const datapackage = await new Datapackage('data/dp2-tabular/datapackage.json')
      let descriptor = fs.readFileSync('data/dp2-tabular/datapackage.json', 'utf8')
      descriptor = JSON.parse(descriptor)
      datapackage.update({ resources: descriptor.resources,
        name: 'New descriptor name' })

      assert(datapackage.descriptor.name === 'New descriptor name')
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

    it('provides the dirname of the descriptor as basePath to the Resource instances', async () => {
      const datapackage = await new Datapackage(
          'data/dp2-tabular/datapackage.json', 'tabular')
      const newResource = {
          name: 'books',
          format: 'csv',
          path: 'data2.csv',
          schema: {
            fields: [
              {
                name: 'year',
                type: 'integer',
              },
              {
                name: 'title',
                type: 'string',
              },
              {
                name: 'director',
                type: 'string',
              },
            ],
          },
        },
        expectedText = fs.readFileSync('data/dp2-tabular/data2.csv', 'utf8'),
        expectedData = parse(expectedText, { auto_parse: true })

      expectedData.shift()
      const validation = datapackage.addResource(newResource)
      const table = await datapackage.resources[1].table
      const data = await table.read()

      assert(validation === true, 'Added resource failed to validate')
      assert(datapackage.resources.length === 2, 'New resource not added to datapackge')
      assert(_.isEqual(data, expectedData), 'Wrong data loaded')
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
      const remoteURL = 'https://raw.githubusercontent.com/frictionlessdata/datapackage-js/master/data/dp1/datapackage.json'
      assert(Datapackage._getBasePath(remoteURL) === remoteURL)
    })

    it('returns appended URL with explicitly provided basePath', async () => {
      const remoteURL = 'http://example.datapackage.url/datapackage.json'
      const basePath = 'datapackage/url'
      const expectedURL = 'http://example.datapackage.url/datapackage/url'
      assert(Datapackage._getBasePath(remoteURL, basePath) === expectedURL)
    })

    it('returns the dirname if the datapackage descriptor is local path', async () => {
      const localPath = 'path/to/datapackage.json'
      const expectedPath = 'path/to'
      assert(Datapackage._getBasePath(localPath) === expectedPath)
    })

    it('returns appended local path with the explicitly provided basePath', () => {
      const localPath = 'path/to/datapackage.json'
      const basePath = 'collected/data/'
      const expectedPath = 'path/to/collected/data/'
      assert(Datapackage._getBasePath(localPath, basePath) === expectedPath)
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
    const testDatapackage = 'https://raw.githubusercontent.com/frictionlessdata/datapackage-js/master/data/dp3-inline-data/datapackage.json'

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
