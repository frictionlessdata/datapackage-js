import 'babel-polyfill'
import _ from 'lodash'
import path from 'path'
import url from 'url'
import { assert } from 'chai'
import jts from 'jsontableschema'
import { Resource } from '../../src/index'
import dp1 from '../../data/dp1/datapackage.json'


// Tests

describe('Resource', () => {

  it('returns expected descriptor', () => {
    const resourceDesc = {
      name: 'foo',
      url: 'http://someplace.com/foo.json',
      path: 'foo.json',
      data: { foo: 'bar' },
    }
    const resource = new Resource(resourceDesc)
    assert(resource.descriptor === resourceDesc, 'Invalid descriptor')
  })

  it('contains no source by default', () => {
    const resourceDesc = {}
    const resource = new Resource(resourceDesc)
    assert(resource.source === null, 'Invalid source')
  })

  it('returns the expected test data', () => {
    const resourceDesc = {
      data: 'foo',
    }
    const resource = new Resource(resourceDesc)
    assert(resource.source === 'foo', 'Invalid source')
  })

  it('returns the expected name', () => {
    const resourceDesc = {
      name: 'FooBar',
    }
    const resource = new Resource(resourceDesc)
    assert(resource.name === resourceDesc.name, 'Invalid name')
  })

  it('recognizes that data type is local', () => {
    const resouceDesc = {
      path: 'foo/bar.txt',
    }
    const resource = new Resource(resouceDesc)
    assert(resource.type === 'local', 'Invalid data type')
  })

  it('recognizes that data type is remote', () => {
    const resouceDesc = {
      path: 'http://www.foo.org/bar.txt',
    }
    const resource = new Resource(resouceDesc)
    assert(resource.type === 'remote', 'Invalid data type')
  })

  it('recognizes that data is inline', () => {
    const resouceDesc = {
      data: 'foo, bar',
    }
    const resource = new Resource(resouceDesc)
    assert(resource.type === 'inline', 'Inline data not found')
  })

  it('table getter returns jts.Table', async () => {
    const resourceDesc = {
      data: 'http://foofoo.org/data.csv',
      schema: {
        fields: [
          { name: 'barfoo' },
        ],
      },
    }

    const resource = new Resource(resourceDesc)
    const table = await resource.table
    assert(table instanceof jts.Table,
           'Returned object is not instance of Table')
  })

  it('table getter returns null if jsontableschama.Table throws an error',
     async () => {
       const resourceDesc = {
         data: 'http://foofoo.org/data.csv',
       }
       const resource = new Resource(resourceDesc)
       const table = await resource.table
       assert(table === null, 'Returned value not null')
     })

  describe('_basePath', () => {
    it('accepts a basePath', () => {
      const basePath = 'data/dp1'
      const resource = new Resource(dp1.resources[0], basePath)
      const resourceBasePath = resource.source

      assert(path.dirname(resourceBasePath) === path.normalize(basePath), 'Incorrect base path')
    })

    it('_basePath is empty string if basePath argument is not provided', () => {
      const resource = new Resource({})
      const source = resource._basePath

      assert(source === '', 'basePath not empty string')
    })
  })

  describe('#source', () => {
    it('returns correct relative path for local resource', async () => {
      const resourcePath = 'dataFolder/data.csv'
      const basePath = 'path/to/datapackage/'
      const expectedPath = 'path/to/datapackage/dataFolder/data.csv'

      const resource = new Resource({
        path: resourcePath,
      }, basePath)

      assert(resource.source === expectedPath)
    })

    it('returns correct relative path for remote resource', async () => {
      const resourcePath = 'dataFolder/data.csv'
      const baseURL = 'http://remote.path.to/datapackage.json'
      const expectedURL = 'http://remote.path.to/dataFolder/data.csv'

      const resource = new Resource({
        path: resourcePath,
      }, baseURL)

      assert(resource.source === expectedURL)
    })

    it('returns just the resource path if there is not basePath specified', async () => {
      const resourcePath = 'dataFolder/data.csv'

      const resource = new Resource({
        path: resourcePath,
      })

      assert(resource.source === resourcePath)
    })

    it('doesn\'t allow reading file which has illegal path', async () => {
      const illegalPaths = ['../data.csv', '/data.csv', 'data/.\\./data.csv', 'data/../../data.csv']
      _.forEach(illegalPaths, resourcePath => {
        try {
          const resource = new Resource({
            path: resourcePath,
          })

          const source = resource.source
          assert(false, `Error for ${resourcePath} not thrown`)
        } catch (err) {
          assert(err instanceof Array, 'Error thrown is not an Array')
          assert(err.length > 0, 'Length of thrown array whould be greater then 0')
        }
      })
    })

    it('doesn\'t allo wreading file which has illegal basePath', async () => {

    })
  })

  describe('Tests with dp1 from data', () => {
    const dpResources = []

    beforeEach(() => {
      _.forEach(dp1.resources, res => {
        dpResources.push(res)
      })
    })

    it('loads the resource descriptor', () => {
      _.forEach(dpResources, res => {
        const resource = new Resource(res)
        assert(resource.descriptor === res, 'Wrong descriptor')
      })
    })

    it('returns the correct name', () => {
      _.forEach(dpResources, res => {
        const resource = new Resource(res)
        assert(resource.name === res.name)
      })
    })

    it('returns the correct source', () => {
      _.forEach(dpResources, res => {
        const resource = new Resource(res)
        assert(resource.source === res.path)
      })
    })

    it('initialize jsontableschema.Table with csv file',
       async done => {
         const resource = new Resource({
           name: 'dp1',
           format: 'csv',
           path: 'data/dp1/data.csv',
           schema: {
             fields: [
               {
                 name: 'name',
                 type: 'string',
               },
               {
                 name: 'size',
                 type: 'integer',
               },
             ],
           },
         })
         try {
           const table = await resource.table
           const data = await table.read(false, false, 1)
           if (data.toString() === 'gb,100') {
             done()
           } else {
             done(Error('Invalid data'))
           }
         } catch (err) {
           done(Error(`Table not initialized, resource.table returned: ${err}`))
         }
       })

    it('returns \'local\' type', () => {
      const resource = new Resource(dp1.resources[0])
      assert(resource.type === 'local', 'Incorrect type for datapackage')
    })
  })

  describe('README', () => {
    it('#Example 1', () => {
      const resourceData = [
        [180, 18, 'Tony'],
        [192, 15, 'Pavle'],
        [160, 32, 'Pero'],
        [202, 23, 'David'],
      ]
      const resourceSchema = {
        fields: [
          {
            name: 'height',
            type: 'integer',
          },
          {
            name: 'age',
            type: 'integer',
          },
          {
            name: 'name',
            type: 'string',
          },
        ],
      }
      const resource = new Resource({ data: resourceData, schema: resourceSchema })

      assert(resource.type === 'inline', 'Data type not inline')
      assert(resource.source === resourceData)
    })
  })
})
