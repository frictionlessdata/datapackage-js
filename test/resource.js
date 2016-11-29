'use strict'

import { assert } from 'chai'
import jts from 'jsontableschema'
import Resource from '../src/resource'

describe('Resource', () => {

  it('returns expected descriptor', () => {
    const resourceDesc = {
      'name': 'foo',
      'url': 'http://someplace.com/foo.json',
      'path': 'foo.json',
      'data': {'foo': 'bar'}
    }
    let resource = new Resource(resourceDesc)
    assert(resource.getDescriptor() === resourceDesc, 'Invalid descriptor')
  })

  it('contains no source by default', () => {
    const resourceDesc = {}
    let resource = new Resource(resourceDesc)
    assert(resource.getSource() === undefined, 'Invalid source')
  })

  it('returns the expected test data', () => {
    const resourceDesc = {
      'data': 'foo'
    }
    let resource = new Resource(resourceDesc)
    assert(resource.getSource() === 'foo', 'Invalid source')
  })

  it('returns the expected name', () => {
    const resourceDesc = {
      'name': 'FooBar'
    }
    let resource = new Resource(resourceDesc)
    assert(resource.getName() === resourceDesc['name'], 'Invalid name')
  })

  it('recognizes that data type is local', () => {
    const resouceDesc = {
      'path': 'foo/bar.txt'
    }
    let resource = new Resource(resouceDesc)
    assert(resource.getType() === 'local', 'Invalid data type')
  })

  it('recognizes that data type is remote', () => {
    const resouceDesc = {
      'path': 'http://www.foo.org/bar.txt'
    }
    let resource = new Resource(resouceDesc)
    assert(resource.getType() === 'remote', 'Invalid data type')
  })

  it('recognizes that data is inline', () => {
    const resouceDesc = {
      'data': 'foo, bar'
    }
    let resource = new Resource(resouceDesc)
    assert(resource.getType() === 'inline', 'Inline data not found')
  })

  it('getTable() returns jts.Table', (done) => {
    const resourceDesc = {
      'data': 'http://foofoo.org/data.csv',
      'schema': { 'fields': [
        { 'name': 'barfoo' }
      ]}
    }

    let resource = new Resource(resourceDesc)
    resource.getTable().then((res) => {
      assert(res instanceof jts.Table, 'Returned object is not instance of Table')
      done()
    }).catch((err) => {
      done(err)
    })
  })
})
