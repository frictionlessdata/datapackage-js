'use strict'

import 'babel-polyfill'
import { assert } from 'chai'
import jts from 'jsontableschema'
import Resource from '../src/resource'
import _ from 'lodash'

import dp1 from './data/dp1/datapackage.json'

describe('Resource', () => {

  it('returns expected descriptor', () => {
    const resourceDesc = {
      'name': 'foo',
      'url': 'http://someplace.com/foo.json',
      'path': 'foo.json',
      'data': { 'foo': 'bar' }
    }
    let resource = new Resource(resourceDesc)
    assert(resource.descriptor === resourceDesc, 'Invalid descriptor')
  })

  it('contains no source by default', () => {
    const resourceDesc = {}
    let resource = new Resource(resourceDesc)
    assert(resource.source === undefined, 'Invalid source')
  })

  it('returns the expected test data', () => {
    const resourceDesc = {
      'data': 'foo'
    }
    let resource = new Resource(resourceDesc)
    assert(resource.source === 'foo', 'Invalid source')
  })

  it('returns the expected name', () => {
    const resourceDesc = {
      'name': 'FooBar'
    }
    let resource = new Resource(resourceDesc)
    assert(resource.name === resourceDesc['name'], 'Invalid name')
  })

  it('recognizes that data type is local', () => {
    const resouceDesc = {
      'path': 'foo/bar.txt'
    }
    let resource = new Resource(resouceDesc)
    assert(resource.type === 'local', 'Invalid data type')
  })

  it('recognizes that data type is remote', () => {
    const resouceDesc = {
      'path': 'http://www.foo.org/bar.txt'
    }
    let resource = new Resource(resouceDesc)
    assert(resource.type === 'remote', 'Invalid data type')
  })

  it('recognizes that data is inline', () => {
    const resouceDesc = {
      'data': 'foo, bar'
    }
    let resource = new Resource(resouceDesc)
    assert(resource.type === 'inline', 'Inline data not found')
  })

  it('table getter returns jts.Table', async() => {
    const resourceDesc = {
      'data': 'http://foofoo.org/data.csv',
      'schema': {
        'fields': [
          { 'name': 'barfoo' }
        ]
      }
    }

    let resource = new Resource(resourceDesc)
    let table = await resource.table
    assert(table instanceof jts.Table,
           'Returned object is not instance of Table')
  })

  it('table getter returns null if jsontableschama.Table throws an error',
     async() => {
       const resourceDesc = {
         'data': 'http://foofoo.org/data.csv',
       }
       let resource = new Resource(resourceDesc)
       let table = await resource.table
       assert(table === null, 'Returned value not null')
     })

  describe('Tests with dp1 from data', () => {
    let dpResources = []

    beforeEach(() => {
      _.forEach(dp1.resources, (res) => {
        dpResources.push(res)
      })
    })

    it('loads the resource descriptor', () => {
      _.forEach(dpResources, (res) => {
        let resource = new Resource(res)
        assert(resource.descriptor === res, 'Wrong descriptor')
      })
    })

    it('returns the correct name', () => {
      _.forEach(dpResources, (res) => {
        let resource = new Resource(res)
        assert(resource.name == res.name)
      })
    })

    it('returns the correct source', () => {
      _.forEach(dpResources, (res) => {
        let resource = new Resource(res)
        assert(resource.source === res.path)
      })
    })

    it('initialize jsontableschema.Table with csv file',
       async(done) => {
         let resource = new Resource({
           "name": "dp1",
           "format": "csv",
           "path": "test/data/dp1/data.csv",
           "schema": {
             "fields": [
               {
                 "name": "name",
                 "type": "string"
               },
               {
                 "name": "size",
                 "type": "integer"
               }
             ]
           }
         })
         let table = await resource.table
         if (table) {
           table.iter((row) => {})
           done()
         } else {
           done(Error('table not initialized'))
         }
       })

    it('returns \'local\' type', () => {
      let resource = new Resource(dp1.resources[0])
      assert(resource.type === 'local', 'Incorrect type for datapackage')
    })
  })
})
