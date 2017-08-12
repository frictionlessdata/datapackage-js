const fs = require('fs')
const axios = require('axios')
const sinon = require('sinon')
const {assert} = require('chai')
const {catchError} = require('./helpers')
const AxiosMock = require('axios-mock-adapter')
const {DataPackage} = require('../src')
const helpers = require('../src/helpers')
const expand = helpers.expandDataPackageDescriptor
const expandResource = helpers.expandResourceDescriptor


// Tests

describe('DataPackage', () => {

  describe('#load', () => {

    it('initializes with Object descriptor', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const datapackage = await DataPackage.load(descriptor, {basePath: 'data/dp1'})
      assert.deepEqual(datapackage.descriptor, expand(descriptor))
    })

    it('initializes with URL descriptor', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const datapackage = await DataPackage.load(
        'https://raw.githubusercontent.com/frictionlessdata/datapackage-js/master/data/dp1/datapackage.json')
      assert.deepEqual(datapackage.descriptor, expand(descriptor))
    })

    it('throws errors for invalid datapackage', async () => {
      const errors = await catchError(DataPackage.load, {})
      assert.instanceOf(errors, Array)
      assert.instanceOf(errors[0], Error)
      assert.include(errors[0].message, 'required property')
    })

    it('stores errors for invalid datapackage in not a strict mode', async () => {
      const datapackage = await DataPackage.load({}, {strict: false})
      assert.instanceOf(datapackage.errors, Array)
      assert.instanceOf(datapackage.errors[0], Error)
      assert.include(datapackage.errors[0].message, 'required property')
      assert.isFalse(datapackage.valid)
    })

    it('loads relative resource', async function() {
      // TODO: For now tableschema doesn't support in-browser table.read
      if (process.env.USER_ENV === 'browser') {
        this.skip()
      }
      const descriptor = 'https://raw.githubusercontent.com/frictionlessdata/datapackage-js/master/data/dp1/datapackage.json'
      const datapackage = await DataPackage.load(descriptor)
      datapackage.resources[0].descriptor.profile = 'tabular-data-resource'
      const data = await datapackage.resources[0].table.read()
      assert.deepEqual(data, [['gb', 100], ['us', 200], ['cn', 300]])
    })

    it('loads resource from absolute URL', async function() {
      // TODO: For now tableschema doesn't support in-browser table.read
      if (process.env.USER_ENV === 'browser') {
        this.skip()
      }
      const descriptor = 'https://dev.keitaro.info/dpkjs/datapackage.json'
      const datapackage = await DataPackage.load(descriptor)
      datapackage.resources[0].descriptor.profile = 'tabular-data-resource'
      const table = await datapackage.resources[0].table
      const data = await table.read()
      assert.deepEqual(data, [['gb', 100], ['us', 200], ['cn', 300]])
    })

    it('loads resource from absolute URL disregarding basePath', async function() {
      // TODO: For now tableschema doesn't support in-browser table.read
      if (process.env.USER_ENV === 'browser') {
        this.skip()
      }
      const descriptor = 'https://dev.keitaro.info/dpkjs/datapackage.json'
      const datapackage = await DataPackage.load(descriptor, {basePath: 'local/basePath'})
      datapackage.resources[0].descriptor.profile = 'tabular-data-resource'
      const table = await datapackage.resources[0].table
      const data = await table.read()
      assert.deepEqual(data, [['gb', 100], ['us', 200], ['cn', 300]])
    })

    it('loads remote resource with basePath', async function() {
      // TODO: For now tableschema doesn't support in-browser table.read
      if (process.env.USER_ENV === 'browser') {
        this.skip()
      }
      const descriptor = 'https://dev.keitaro.info/dpkjs/datapackage.json'
      const datapackage = await DataPackage.load(descriptor, {basePath: 'data'})
      datapackage.resources[1].descriptor.profile = 'tabular-data-resource'
      const table = await datapackage.resources[1].table
      const data = await table.read()
      assert.deepEqual(data, [['gb', 105], ['us', 205], ['cn', 305]])
    })

  })

  describe('#descriptor (retrieve)', () => {
    let http

    beforeEach(() => {http = new AxiosMock(axios)})
    afterEach(() => {http.restore()})

    it('object', async () => {
      const descriptor = {
        resources: [
          {name: 'name', data: ['data']},
        ],
      }
      const datapackage = await DataPackage.load(descriptor)
      assert.deepEqual(datapackage.descriptor, expand(descriptor))
    })

    it('string remote path', async () => {
      const contents = require('../data/data-package.json')
      const descriptor = 'http://example.com/data-package.json'
      http.onGet(descriptor).reply(200, contents)
      const datapackage = await DataPackage.load(descriptor)
      assert.deepEqual(datapackage.descriptor, expand(contents))
    })

    it('string remote path bad', async () => {
      const descriptor = 'http://example.com/bad-path.json'
      http.onGet(descriptor).reply(500)
      const error = await catchError(DataPackage.load, descriptor)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'Can not retrieve remote')
    })

    it('string local path', async () => {
      const contents = require('../data/data-package.json')
      const descriptor = 'data/data-package.json'
      if (process.env.USER_ENV !== 'browser') {
        const datapackage = await DataPackage.load(descriptor)
        assert.deepEqual(datapackage.descriptor, expand(contents))
      } else {
        const error = await catchError(DataPackage.load, descriptor)
        assert.instanceOf(error, Error)
        assert.include(error.message, 'in browser is not supported')
      }
    })

    it('string local path bad', async () => {
      const descriptor = 'data/bad-path.json'
      const error = await catchError(DataPackage.load, descriptor)
      assert.instanceOf(error, Error)
      if (process.env.USER_ENV !== 'browser') {
        assert.include(error.message, 'Can not retrieve local')
      } else {
        assert.include(error.message, 'in browser is not supported')
      }
    })

  })

  describe('#descriptor (dereference)', () => {
    let http

    beforeEach(() => {http = new AxiosMock(axios)})
    afterEach(() => {http.restore()})

    it('mixed', async () => {
      const descriptor = 'data/data-package-dereference.json'
      if (process.env.USER_ENV !== 'browser') {
        const datapackage = await DataPackage.load(descriptor)
        assert.deepEqual(datapackage.descriptor.resources, [
          {name: 'name1', data: ['data'], schema: {fields: [{name: 'name'}]}},
          {name: 'name2', data: ['data'], dialect: {delimiter: ','}},
        ].map(expandResource))
      } else {
        const error = await catchError(DataPackage.load, descriptor)
        assert.instanceOf(error, Error)
        assert.include(error.message, 'in browser')
      }
    })

    it('pointer', async () => {
      const descriptor = {
        resources: [
          {name: 'name1', data: ['data'], schema: '#/schemas/main'},
          {name: 'name2', data: ['data'], dialect: '#/dialects/0'},
        ],
        schemas: {main: {fields: [{name: 'name'}]}},
        dialects: [{delimiter: ','}],
      }
      const datapackage = await DataPackage.load(descriptor)
      assert.deepEqual(datapackage.descriptor.resources, [
        {name: 'name1', data: ['data'], schema: {fields: [{name: 'name'}]}},
        {name: 'name2', data: ['data'], dialect: {delimiter: ','}},
      ].map(expandResource))
    })

    it('pointer bad', async () => {
      const descriptor = {
        resources: [
          {name: 'name1', data: ['data'], schema: '#/schemas/main'},
        ],
      }
      const error = await catchError(DataPackage.load, descriptor)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'Not resolved Pointer URI')
    })

    it('remote', async () => {
      const descriptor = {
        resources: [
          {name: 'name1', data: ['data'], schema: 'http://example.com/schema'},
          {name: 'name2', data: ['data'], dialect: 'http://example.com/dialect'},
        ],
      }
      http.onGet('http://example.com/schema').reply(200, {fields: [{name: 'name'}]})
      http.onGet('http://example.com/dialect').reply(200, {delimiter: ','})
      const datapackage = await DataPackage.load(descriptor)
      assert.deepEqual(datapackage.descriptor.resources, [
        {name: 'name1', data: ['data'], schema: {fields: [{name: 'name'}]}},
        {name: 'name2', data: ['data'], dialect: {delimiter: ','}},
      ].map(expandResource))
    })

    it('remote bad', async () => {
      const descriptor = {
        resources: [
          {name: 'name1', data: ['data'], schema: 'http://example.com/schema'},
        ],
      }
      http.onGet('http://example.com/schema').reply(500)
      const error = await catchError(DataPackage.load, descriptor)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'Not resolved Remote URI')
    })

    it('local', async () => {
      const descriptor = {
        resources: [
          {name: 'name1', data: ['data'], schema: 'table-schema.json'},
          {name: 'name2', data: ['data'], dialect: 'csv-dialect.json'},
        ],
      }
      if (process.env.USER_ENV !== 'browser') {
        const datapackage = await DataPackage.load(descriptor, {basePath: 'data'})
        assert.deepEqual(datapackage.descriptor.resources, [
          {name: 'name1', data: ['data'], schema: {fields: [{name: 'name'}]}},
          {name: 'name2', data: ['data'], dialect: {delimiter: ','}},
        ].map(expandResource))
      } else {
        const error = await catchError(DataPackage.load, descriptor, {basePath: 'data'})
        assert.instanceOf(error, Error)
        assert.include(error.message, 'in browser')
      }
    })

    it('local bad', async () => {
      const descriptor = {
        resources: [
          {name: 'name1', data: ['data'], schema: 'bad-path.json'},
        ],
      }
      const error = await catchError(DataPackage.load, descriptor, {basePath: 'data'})
      assert.instanceOf(error, Error)
      if (process.env.USER_ENV !== 'browser') {
        assert.include(error.message, 'Not resolved Local URI')
      } else {
        assert.include(error.message, 'in browser')
      }
    })

    it('local bad not safe', async () => {
      const descriptor = {
        resources: [
          {name: 'name1', data: ['data'], schema: '../data/table-schema.json'},
        ],
      }
      const error = await catchError(DataPackage.load, descriptor, {basePath: 'data'})
      assert.instanceOf(error, Error)
      if (process.env.USER_ENV !== 'browser') {
        assert.include(error.message, 'Not safe path')
      } else {
        assert.include(error.message, 'in browser')
      }
    })

  })

  describe('#descriptor (expand)', () => {

    it('resource', async () => {
      const descriptor = {
        resources: [
          {
            name: 'name',
            data: ['data'],
          },
        ],
      }
      const datapackage = await DataPackage.load(descriptor)
      assert.deepEqual(datapackage.descriptor, {
        profile: 'data-package',
        resources: [
          {
            name: 'name',
            data: ['data'],
            profile: 'data-resource',
            encoding: 'utf-8',
          },
        ],
      })
    })

    it('tabular resource schema', async () => {
      const descriptor = {
        resources: [
          {
            name: 'name',
            data: ['data'],
            profile: 'tabular-data-resource',
            schema: {fields: [{name: 'name'}]},
          },
        ],
      }
      const datapackage = await DataPackage.load(descriptor)
      assert.deepEqual(datapackage.descriptor, {
        profile: 'data-package',
        resources: [{
          name: 'name',
          data: ['data'],
          profile: 'tabular-data-resource',
          encoding: 'utf-8',
          schema: {
            fields: [{name: 'name', type: 'string', format: 'default'}],
            missingValues: [''],
          },
        }],
      })
    })

    it('tabular resource dialect', async () => {
      const descriptor = {
        resources: [
          {
            name: 'name',
            data: ['data'],
            profile: 'tabular-data-resource',
            dialect: {delimiter: 'custom'},
          },
        ],
      }
      const datapackage = await DataPackage.load(descriptor)
      assert.deepEqual(datapackage.descriptor, {
        profile: 'data-package',
        resources: [{
          name: 'name',
          data: ['data'],
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
        }],
      })
    })

  })

  describe('#resources', () => {

    it('names', async () => {
      const descriptor = require('../data/data-package-multiple-resources.json')
      const datapackage = await DataPackage.load(descriptor, {basePath: 'data'})
      assert.lengthOf(datapackage.resources, 2)
      assert.deepEqual(datapackage.resourceNames, ['name1', 'name2'])
    })

    it('add', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const datapackage = await DataPackage.load(descriptor, {basePath: 'data/dp1'})
      const resource = datapackage.addResource({name: 'name', data: ['test']})
      assert.isOk(resource)
      assert.lengthOf(datapackage.resources, 2)
      assert.deepEqual(datapackage.resources[1].source, ['test'])
    })

    it('add invalid - throws array of errors', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const datapackage = await DataPackage.load(descriptor, {basePath: 'data/dp1'})
      try {
        datapackage.addResource({})
        assert.isOk(false)
      } catch (errors) {
        assert.instanceOf(errors, Array)
        assert.instanceOf(errors[0], Error)
        assert.include(errors[0].message, 'Missing required property')
      }
    })

    it('add invalid - save errors in not a strict mode', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const datapackage = await DataPackage.load(descriptor,
        {basePath: 'data/dp1', strict: false})
      datapackage.addResource({})
      assert.instanceOf(datapackage.errors[0], Error)
      assert.include(datapackage.errors[0].message, 'Missing required property')
      assert.isFalse(datapackage.valid)
    })

    // TODO: Rebase on non-strict mode
    it.skip('add tabular - can read data', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const datapackage = await DataPackage.load(descriptor, {basePath: 'data/dp1'})
      datapackage.addResource({
        name: 'name',
        data: [['id', 'name'], ['1', 'alex'], ['2', 'john']],
        schema: {
          fields: [
            {name: 'id', type: 'integer'},
            {name: 'name', type: 'string'},
          ],
        },
      })
      const rows = await datapackage.resources[1].table.read()
      assert.deepEqual(rows, [[1, 'alex'], [2, 'john']])
    })

    it('add with not a safe path - throw an error', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const datapackage = await DataPackage.load(descriptor, {basePath: 'data/dp1'})
      try {
        datapackage.addResource({
          name: 'name',
          path: ['../dp1/data.csv'],
        })
        assert.isNotOk(true)
      } catch (error) {
        assert.instanceOf(error, Error)
        assert.include(error.message, 'not safe')
      }
    })

    it('get existent', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const datapackage = await DataPackage.load(descriptor, {basePath: 'data/dp1'})
      const resource = datapackage.getResource('random')
      assert.deepEqual(resource.name, 'random')
    })

    it('get non existent', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const datapackage = await DataPackage.load(descriptor, {basePath: 'data/dp1'})
      const resource = datapackage.getResource('non-existent')
      assert.isNull(resource)
    })

    it('remove existent', async () => {
      const descriptor = require('../data/data-package-multiple-resources.json')
      const datapackage = await DataPackage.load(descriptor, {basePath: 'data'})
      assert.lengthOf(datapackage.resources, 2)
      assert.lengthOf(datapackage.descriptor.resources, 2)
      assert.deepEqual(datapackage.resources[0].name, 'name1')
      assert.deepEqual(datapackage.resources[1].name, 'name2')
      const resource = datapackage.removeResource('name2')
      assert.lengthOf(datapackage.resources, 1)
      assert.lengthOf(datapackage.descriptor.resources, 1)
      assert.deepEqual(datapackage.resources[0].name, 'name1')
      assert.deepEqual(resource.name, 'name2')
    })

    it('remove non existent', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const datapackage = await DataPackage.load(descriptor, {basePath: 'data/dp1'})
      const resource = datapackage.removeResource('non-existent')
      assert.isNull(resource)
      assert.lengthOf(datapackage.resources, 1)
      assert.lengthOf(datapackage.descriptor.resources, 1)
    })

  })

  describe('#save', () => {

    it('general', async function () {
      // TODO: check it trows correct error in browser
      if (process.env.USER_ENV === 'browser') {
        this.skip()
      }
      const descriptor = {resources: [{name: 'name', data: ['data']}]}
      const datapackage = await DataPackage.load(descriptor)
      const writeFileSync = sinon.stub(fs, 'writeFileSync')
      await datapackage.save('target')
      writeFileSync.restore()
      sinon.assert.calledWith(writeFileSync,
        'target', JSON.stringify(expand(descriptor)))
    })

  })

  describe('#update', () => {

    it('modified', async () => {
      const descriptor = {resources: [{name: 'name', data: ['data']}]}
      const datapackage = await DataPackage.load(descriptor)
      datapackage.descriptor.resources[0].name = 'modified'
      assert.deepEqual(datapackage.resources[0].name, 'name')
      const result = datapackage.update()
      assert.deepEqual(datapackage.resources[0].name, 'modified')
      assert.isTrue(result)
    })

    it('modified invalid', async () => {
      const descriptor = {resources: [{name: 'name', data: ['data']}]}
      const datapackage = await DataPackage.load(descriptor)
      datapackage.descriptor.resources = []
      try {
        datapackage.update()
        assert.isOk(false)
      } catch (errors) {
        assert.instanceOf(errors, Array)
        assert.instanceOf(errors[0], Error)
        assert.include(errors[0].message, 'Array is too short')
      }
    })

    it('not modified', async () => {
      const descriptor = {resources: [{name: 'name', data: ['data']}]}
      const datapackage = await DataPackage.load(descriptor)
      const result = datapackage.update()
      assert.deepEqual(datapackage.descriptor, expand(descriptor))
      assert.isFalse(result)
    })

  })

})
