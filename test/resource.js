const axios = require('axios')
const {assert} = require('chai')
const {Table} = require('tableschema')
const {catchError} = require('./helpers')
const AxiosMock = require('axios-mock-adapter')
const {Resource} = require('../src/resource')
const helpers = require('../src/helpers')
const expand = helpers.expandResourceDescriptor


// Tests

describe('Resource', () => {
  let http

  beforeEach(() => {http = new AxiosMock(axios)})
  afterEach(() => {http.restore()})

  describe('#load', () => {

    it('works with base descriptor', async () => {
      const descriptor = {
        name: 'name',
        data: ['data'],
      }
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.name, 'name')
      assert.deepEqual(resource.tabular, false)
      assert.deepEqual(resource.descriptor, expand(descriptor))
      assert.deepEqual(resource.sourceType, 'inline')
      assert.deepEqual(resource.source, ['data'])
      assert.deepEqual(resource.table, null)
    })

    it('works with tabular descriptor', async () => {
      const descriptor = {
        name: 'name',
        data: ['data'],
        profile: 'tabular-data-resource',
      }
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.name, 'name')
      assert.deepEqual(resource.tabular, true)
      assert.deepEqual(resource.descriptor, expand(descriptor))
      assert.deepEqual(resource.sourceType, 'inline')
      assert.deepEqual(resource.source, ['data'])
      assert.isOk(resource.table)
    })

  })

  describe('#descriptor (retrieve)', () => {

    it('object', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
      }
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.descriptor, expand(descriptor))
    })

    it('string remote path', async () => {
      const contents = require('../data/data-resource.json')
      const descriptor = 'http://example.com/data-resource.json'
      http.onGet(descriptor).reply(200, contents)
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.descriptor, expand(contents))
    })

    it('string remote path bad', async () => {
      const descriptor = 'http://example.com/bad-path.json'
      http.onGet(descriptor).reply(500)
      const error = await catchError(Resource.load, descriptor)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'Can not retrieve remote')
    })

    it('string local path', async () => {
      const contents = require('../data/data-resource.json')
      const descriptor = 'data/data-resource.json'
      if (process.env.USER_ENV !== 'browser') {
        const resource = await Resource.load(descriptor)
        assert.deepEqual(resource.descriptor, expand(contents))
      } else {
        const error = await catchError(Resource.load, descriptor)
        assert.instanceOf(error, Error)
        assert.include(error.message, 'in browser is not supported')
      }
    })

    it('string local path bad', async () => {
      const descriptor = 'data/bad-path.json'
      const error = await catchError(Resource.load, descriptor)
      assert.instanceOf(error, Error)
      if (process.env.USER_ENV !== 'browser') {
        assert.include(error.message, 'Can not retrieve local')
      } else {
        assert.include(error.message, 'in browser is not supported')
      }
    })

  })

  describe('#descriptor (dereference)', () => {

    it('general', async () => {
      const descriptor = 'data/data-resource-dereference.json'
      if (process.env.USER_ENV !== 'browser') {
        const resource = await Resource.load(descriptor)
        assert.deepEqual(resource.descriptor, expand({
          name: 'name',
          data: 'data',
          schema: {fields: [{name: 'name'}]},
          dialect: {delimiter: ','},
          dialects: {main: {delimiter: ','}},
        }))
      } else {
        const error = await catchError(Resource.load, descriptor)
        assert.instanceOf(error, Error)
        assert.include(error.message, 'in browser')
      }
    })

    it('pointer', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
        schema: '#/schemas/main',
        schemas: {main: {fields: [{name: 'name'}]}},
      }
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.descriptor, expand({
        name: 'name',
        data: 'data',
        schema: {fields: [{name: 'name'}]},
        schemas: {main: {fields: [{name: 'name'}]}},
      }))
    })

    it('pointer bad', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
        schema: '#/schemas/main',
      }
      const error = await catchError(Resource.load, descriptor)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'Not resolved Pointer URI')
    })

    it('remote', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
        schema: 'http://example.com/schema',
      }
      http.onGet(descriptor.schema).reply(200, {fields: [{name: 'name'}]})
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.descriptor, expand({
        name: 'name',
        data: 'data',
        schema: {fields: [{name: 'name'}]},
      }))
    })

    it('remote bad', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
        schema: 'http://example.com/schema',
      }
      http.onGet(descriptor.schema).reply(500)
      const error = await catchError(Resource.load, descriptor)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'Not resolved Remote URI')
    })

    it('local', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
        schema: 'table-schema.json',
      }
      if (process.env.USER_ENV !== 'browser') {
        const resource = await Resource.load(descriptor, {basePath: 'data'})
        assert.deepEqual(resource.descriptor, expand({
          name: 'name',
          data: 'data',
          schema: {fields: [{name: 'name'}]},
        }))
      } else {
        const error = await catchError(Resource.load, descriptor, {basePath: 'data'})
        assert.instanceOf(error, Error)
        assert.include(error.message, 'in browser is not supported')
      }
    })

    it('local bad', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
        schema: 'bad-path.json',
      }
      const error = await catchError(Resource.load, descriptor, {basePath: 'data'})
      assert.instanceOf(error, Error)
      if (process.env.USER_ENV !== 'browser') {
        assert.include(error.message, 'Not resolved Local URI')
      } else {
        assert.include(error.message, 'in browser is not supported')
      }
    })

    it('local bad not safe', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
        schema: '../data/table_schema.json',
      }
      const error = await catchError(Resource.load, descriptor, {basePath: 'data'})
      assert.instanceOf(error, Error)
      if (process.env.USER_ENV !== 'browser') {
        assert.include(error.message, 'Not safe path')
      } else {
        assert.include(error.message, 'in browser is not supported')
      }
    })

  })

  describe('#descriptor (expand)', () => {

    it('general resource', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
      }
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.descriptor, {
        name: 'name',
        data: 'data',
        profile: 'data-resource',
        encoding: 'utf-8',
      })
    })

    it('tabular resource schema', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
        profile: 'tabular-data-resource',
        schema: {
          fields: [{name: 'name'}],
        },
      }
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.descriptor, {
        name: 'name',
        data: 'data',
        profile: 'tabular-data-resource',
        encoding: 'utf-8',
        schema: {
          fields: [{name: 'name', type: 'string', format: 'default'}],
          missingValues: [''],
        },
      })
    })

    it('tabular resource dialect', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
        profile: 'tabular-data-resource',
        dialect: {
          delimiter: 'custom',
        },
      }
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.descriptor, {
        name: 'name',
        data: 'data',
        profile: 'tabular-data-resource',
        encoding: 'utf-8',
        dialect: {
          delimiter: 'custom',
          doubleQuote: true,
          lineTerminator: '\r\n',
          quoteChar: '"',
          escapeChar: '\\',
          skipInitialSpace: true,
          header: true,
          caseSensitiveHeader: false,
        },
      })
    })

  })

  describe('#source/sourceType', () => {

    it('inline', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
        path: ['path'],
      }
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.source, 'data')
      assert.deepEqual(resource.sourceType, 'inline')
    })

    it('local', async () => {
      const descriptor = {
        name: 'name',
        path: ['table.csv'],
      }
      const resource = await Resource.load(descriptor, {basePath: 'data'})
      assert.deepEqual(resource.source, 'data/table.csv')
      assert.deepEqual(resource.sourceType, 'local')
    })

    it('local base no base path', async () => {
      const descriptor = {
        name: 'name',
        path: ['table.csv'],
      }
      const error = await catchError(Resource.load, descriptor)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'requires base path')
    })

    it('local bad not safe absolute', async () => {
      const descriptor = {
        name: 'name',
        path: ['/fixtures/table.csv'],
      }
      const error = await catchError(Resource.load, descriptor, {basePath: 'data'})
      assert.instanceOf(error, Error)
      assert.include(error.message, 'not safe')
    })

    it('local bad not safe traversing', async () => {
      const descriptor = {
        name: 'name',
        path: ['../fixtures/table.csv'],
      }
      const error = await catchError(Resource.load, descriptor, {basePath: 'data'})
      assert.instanceOf(error, Error)
      assert.include(error.message, 'not safe')
    })

    it('remote', async () => {
      const descriptor = {
        name: 'name',
        path: ['http://example.com/table.csv'],
      }
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.source, 'http://example.com/table.csv')
      assert.deepEqual(resource.sourceType, 'remote')
    })

    it('remote path relative and base path remote', async () => {
      const descriptor = {
        name: 'name',
        path: ['table.csv'],
      }
      const resource = await Resource.load(descriptor, {basePath: 'http://example.com/'})
      assert.deepEqual(resource.source, 'http://example.com/table.csv')
      assert.deepEqual(resource.sourceType, 'remote')
    })

    it('remote path remote and base path remote', async () => {
      const descriptor = {
        name: 'name',
        path: ['http://example1.com/table.csv'],
      }
      const resource = await Resource.load(descriptor, {basePath: 'http://example2.com/'})
      assert.deepEqual(resource.source, 'http://example1.com/table.csv')
      assert.deepEqual(resource.sourceType, 'remote')
    })

    it('multipart local', async () => {
      const descriptor = {
        name: 'name',
        path: ['chunk1.csv', 'chunk2.csv'],
      }
      const resource = await Resource.load(descriptor, {basePath: 'data'})
      assert.deepEqual(resource.source, ['data/chunk1.csv', 'data/chunk2.csv'])
      assert.deepEqual(resource.sourceType, 'multipart-local')
    })

    it('multipart local bad no base path', async () => {
      const descriptor = {
        name: 'name',
        path: ['chunk1.csv', 'chunk2.csv'],
      }
      const error = await catchError(Resource.load, descriptor)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'requires base path')
    })

    it('multipart local bad not safe absolute', async () => {
      const descriptor = {
        name: 'name',
        path: ['/fixtures/chunk1.csv', 'chunk2.csv'],
      }
      const error = await catchError(Resource.load, descriptor, {basePath: 'data'})
      assert.instanceOf(error, Error)
      assert.include(error.message, 'not safe')
    })

    it('multipart local bad not safe traversing', async () => {
      const descriptor = {
        name: 'name',
        path: ['chunk1.csv', '../fixtures/chunk2.csv'],
      }
      const error = await catchError(Resource.load, descriptor, {basePath: 'data'})
      // Assert
      assert.instanceOf(error, Error)
      assert.include(error.message, 'not safe')
    })

    it('multipart remote', async () => {
      const descriptor = {
        name: 'name',
        path: ['http://example.com/chunk1.csv', 'http://example.com/chunk2.csv'],
      }
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.source,
          ['http://example.com/chunk1.csv', 'http://example.com/chunk2.csv'])
      assert.deepEqual(resource.sourceType, 'multipart-remote')
    })

    it('multipart remote path relative and base path remote', async () => {
      const descriptor = {
        name: 'name',
        path: ['chunk1.csv', 'chunk2.csv'],
      }
      const resource = await Resource.load(descriptor, {basePath: 'http://example.com'})
      assert.deepEqual(resource.source,
          ['http://example.com/chunk1.csv', 'http://example.com/chunk2.csv'])
      assert.deepEqual(resource.sourceType, 'multipart-remote')
    })

    it('multipart remote path remote and base path remote', async () => {
      const descriptor = {
        name: 'name',
        path: ['chunk1.csv', 'http://example2.com/chunk2.csv'],
      }
      const resource = await Resource.load(descriptor, {basePath: 'http://example1.com'})
      assert.deepEqual(resource.source,
          ['http://example1.com/chunk1.csv', 'http://example2.com/chunk2.csv'])
      assert.deepEqual(resource.sourceType, 'multipart-remote')
    })

  })

  describe('#table', () => {

    it('general resource', async () => {
      const descriptor = {
        name: 'name',
        data: 'data',
      }
      const resource = await Resource.load(descriptor)
      assert.deepEqual(resource.table, null)
    })

    it('tabular resource inline', async () => {
      const descriptor = {
        name: 'example',
        profile: 'tabular-data-resource',
        data: [
          ['height', 'age', 'name'],
          ['180', '18', 'Tony'],
          ['192', '32', 'Jacob'],
        ],
        schema: {
          fields: [
            {name: 'height', type: 'integer'},
            {name: 'age', type: 'integer'},
            {name: 'name', type: 'string'},
          ],
        },
      }
      const resource = await Resource.load(descriptor)
      assert.instanceOf(resource.table, Table)
      assert.deepEqual(await resource.table.read(), [
          [180, 18, 'Tony'],
          [192, 32, 'Jacob'],
      ])
    })

    it('tabular resource local', async function() {
      // Skip test for browser
      if (process.env.USER_ENV === 'browser') {
        this.skip()
      }
      // Prepare
      const descriptor = {
        name: 'example',
        profile: 'tabular-data-resource',
        path: ['dp1/data.csv'],
        schema: {
          fields: [
            {name: 'name', type: 'string'},
            {name: 'size', type: 'integer'},
          ],
        },
      }
      const resource = await Resource.load(descriptor, {basePath: 'data'})
      // Assert
      assert.instanceOf(resource.table, Table)
      assert.deepEqual(await resource.table.read(), [
          ['gb', 100],
          ['us', 200],
          ['cn', 300],
      ])
    })

  })

})
