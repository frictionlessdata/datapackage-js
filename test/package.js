const fs = require('fs')
const JSZip = require('jszip')
const axios = require('axios')
const sinon = require('sinon')
const {assert} = require('chai')
const {promisify} = require('util')
const {catchError} = require('./helpers')
const cloneDeep = require('lodash/cloneDeep')
const AxiosMock = require('axios-mock-adapter')
const {Package} = require('../src')
const helpers = require('../src/helpers')
const expand = helpers.expandPackageDescriptor
const expandResource = helpers.expandResourceDescriptor


// Tests

describe('Package', () => {

  describe('#load', () => {

    it('initializes with Object descriptor', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const dataPackage = await Package.load(descriptor, {basePath: 'data/dp1'})
      assert.deepEqual(dataPackage.descriptor, expand(descriptor))
    })

    it('initializes with URL descriptor', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const dataPackage = await Package.load(
        'https://raw.githubusercontent.com/frictionlessdata/datapackage-js/master/data/dp1/datapackage.json')
      assert.deepEqual(dataPackage.descriptor, expand(descriptor))
    })

    it('throws errors for invalid datapackage in strict mode', async () => {
      const error = await catchError(Package.load, {}, {strict: true})
      assert.instanceOf(error, Error)
      assert.instanceOf(error.errors[0], Error)
      assert.include(error.errors[0].message, 'required property')
    })

    it('stores errors for invalid datapackage', async () => {
      const dataPackage = await Package.load()
      assert.instanceOf(dataPackage.errors, Array)
      assert.instanceOf(dataPackage.errors[0], Error)
      assert.include(dataPackage.errors[0].message, 'required property')
      assert.isFalse(dataPackage.valid)
    })

    it('loads relative resource', async function() {
      // TODO: For now tableschema doesn't support in-browser table.read
      if (process.env.USER_ENV === 'browser') {
        this.skip()
      }
      const descriptor = 'https://raw.githubusercontent.com/frictionlessdata/datapackage-js/master/data/dp1/datapackage.json'
      const dataPackage = await Package.load(descriptor)
      dataPackage.resources[0].descriptor.profile = 'tabular-data-resource'
      const data = await dataPackage.resources[0].table.read()
      assert.deepEqual(data, [['gb', 100], ['us', 200], ['cn', 300]])
    })

    it('loads resource from absolute URL', async function() {
      // TODO: For now tableschema doesn't support in-browser table.read
      if (process.env.USER_ENV === 'browser') {
        this.skip()
      }
      const descriptor = 'https://dev.keitaro.info/dpkjs/datapackage.json'
      const dataPackage = await Package.load(descriptor)
      dataPackage.resources[0].descriptor.profile = 'tabular-data-resource'
      const table = await dataPackage.resources[0].table
      const data = await table.read()
      assert.deepEqual(data, [['gb', 100], ['us', 200], ['cn', 300]])
    })

    it('loads resource from absolute URL disregarding basePath', async function() {
      // TODO: For now tableschema doesn't support in-browser table.read
      if (process.env.USER_ENV === 'browser') {
        this.skip()
      }
      const descriptor = 'https://dev.keitaro.info/dpkjs/datapackage.json'
      const dataPackage = await Package.load(descriptor, {basePath: 'local/basePath'})
      dataPackage.resources[0].descriptor.profile = 'tabular-data-resource'
      const table = await dataPackage.resources[0].table
      const data = await table.read()
      assert.deepEqual(data, [['gb', 100], ['us', 200], ['cn', 300]])
    })

    it('loads remote resource with basePath', async function() {
      // TODO: For now tableschema doesn't support in-browser table.read
      if (process.env.USER_ENV === 'browser') {
        this.skip()
      }
      const descriptor = 'https://dev.keitaro.info/dpkjs/datapackage.json'
      const dataPackage = await Package.load(descriptor, {basePath: 'data'})
      dataPackage.resources[1].descriptor.profile = 'tabular-data-resource'
      const table = await dataPackage.resources[1].table
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
      const dataPackage = await Package.load(descriptor)
      assert.deepEqual(dataPackage.descriptor, expand(descriptor))
    })

    it('string remote path', async () => {
      const contents = require('../data/data-package.json')
      const descriptor = 'http://example.com/data-package.json'
      http.onGet(descriptor).reply(200, contents)
      const dataPackage = await Package.load(descriptor)
      assert.deepEqual(dataPackage.descriptor, expand(contents))
    })

    it('string remote path bad', async () => {
      const descriptor = 'http://example.com/bad-path.json'
      http.onGet(descriptor).reply(500)
      const error = await catchError(Package.load, descriptor)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'Can not retrieve remote')
    })

    it('string local path', async () => {
      const contents = require('../data/data-package.json')
      const descriptor = 'data/data-package.json'
      if (process.env.USER_ENV !== 'browser') {
        const dataPackage = await Package.load(descriptor)
        assert.deepEqual(dataPackage.descriptor, expand(contents))
      } else {
        const error = await catchError(Package.load, descriptor)
        assert.instanceOf(error, Error)
        assert.include(error.message, 'in browser is not supported')
      }
    })

    it('string local path bad', async () => {
      const descriptor = 'data/bad-path.json'
      const error = await catchError(Package.load, descriptor)
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
        const dataPackage = await Package.load(descriptor)
        assert.deepEqual(dataPackage.descriptor.resources, [
          {name: 'name1', data: ['data'], schema: {fields: [{name: 'name'}]}},
          {name: 'name2', data: ['data'], dialect: {delimiter: ','}},
        ].map(expandResource))
      } else {
        const error = await catchError(Package.load, descriptor)
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
      const dataPackage = await Package.load(descriptor)
      assert.deepEqual(dataPackage.descriptor.resources, [
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
      const error = await catchError(Package.load, descriptor)
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
      const dataPackage = await Package.load(descriptor)
      assert.deepEqual(dataPackage.descriptor.resources, [
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
      const error = await catchError(Package.load, descriptor)
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
        const dataPackage = await Package.load(descriptor, {basePath: 'data'})
        assert.deepEqual(dataPackage.descriptor.resources, [
          {name: 'name1', data: ['data'], schema: {fields: [{name: 'name'}]}},
          {name: 'name2', data: ['data'], dialect: {delimiter: ','}},
        ].map(expandResource))
      } else {
        const error = await catchError(Package.load, descriptor, {basePath: 'data'})
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
      const error = await catchError(Package.load, descriptor, {basePath: 'data'})
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
      const error = await catchError(Package.load, descriptor, {basePath: 'data'})
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
      const dataPackage = await Package.load(descriptor)
      assert.deepEqual(dataPackage.descriptor, {
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
      const dataPackage = await Package.load(descriptor)
      assert.deepEqual(dataPackage.descriptor, {
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
      const dataPackage = await Package.load(descriptor)
      assert.deepEqual(dataPackage.descriptor, {
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
            skipInitialSpace: true,
            header: true,
            caseSensitiveHeader: false,
          },
        }],
      })
    })

    it('tabular resource dialect updates quoteChar when given', async () => {
      const descriptor = {
        resources: [
          {
            name: 'name',
            data: ['data'],
            profile: 'tabular-data-resource',
            dialect: {delimiter: 'custom', quoteChar: '+'},
          },
        ],
      }
      const dataPackage = await Package.load(descriptor)
      assert.deepEqual(dataPackage.descriptor, {
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
            quoteChar: '+',
            skipInitialSpace: true,
            header: true,
            caseSensitiveHeader: false,
          },
        }],
      })
    })

    it('tabular resource dialect does not include quoteChar, given escapeChar', async () => {
      const descriptor = {
        resources: [
          {
            name: 'name',
            data: ['data'],
            profile: 'tabular-data-resource',
            dialect: {delimiter: 'custom', escapeChar: '\\+'},
          },
        ],
      }
      const dataPackage = await Package.load(descriptor)
      assert.deepEqual(dataPackage.descriptor, {
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
            escapeChar: '\\+',
            skipInitialSpace: true,
            header: true,
            caseSensitiveHeader: false,
          },
        }],
      })
    })

    it('tabular resource dialect throws error given escapeChar and quoteChar', async () => {
      const descriptor = {
        resources: [
          {
            name: 'name',
            data: ['data'],
            profile: 'tabular-data-resource',
            dialect: {
              delimiter: 'custom',
              escapeChar: '\\',
              quoteChar: '"'},
          },
        ],
      }
      const error = await catchError(Package.load, descriptor)
      assert.instanceOf(error, Error)
      assert.include(error.message, 'quoteChar and escapeChar are mutually exclusive')
    })


  })

  describe('#resources', () => {

    it('names', async () => {
      const descriptor = require('../data/data-package-multiple-resources.json')
      const dataPackage = await Package.load(descriptor, {basePath: 'data'})
      assert.lengthOf(dataPackage.resources, 2)
      assert.deepEqual(dataPackage.resourceNames, ['name1', 'name2'])
    })

    it('add', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const dataPackage = await Package.load(descriptor, {basePath: 'data/dp1'})
      const resource = dataPackage.addResource({name: 'name', data: ['test']})
      assert.isOk(resource)
      assert.lengthOf(dataPackage.resources, 2)
      assert.deepEqual(dataPackage.resources[1].source, ['test'])
    })

    it('add invalid - throws array of errors in strict mode', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const dataPackage = await Package.load(descriptor, {
        basePath: 'data/dp1', strict: true,
      })
      const error = await catchError(dataPackage.addResource.bind(dataPackage), {})
      assert.instanceOf(error, Error)
      assert.instanceOf(error.errors[0], Error)
      assert.include(error.errors[0].message, 'Data does not match any schemas')
    })

    it('add invalid - save errors in not a strict mode', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const dataPackage = await Package.load(descriptor, {basePath: 'data/dp1'})
      dataPackage.addResource({})
      assert.instanceOf(dataPackage.errors[0], Error)
      assert.include(dataPackage.errors[0].message, 'Data does not match any schemas')
      assert.isFalse(dataPackage.valid)
    })

    it('add tabular - can read data', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const dataPackage = await Package.load(descriptor, {basePath: 'data/dp1'})
      dataPackage.addResource({
        name: 'name',
        data: [['id', 'name'], ['1', 'alex'], ['2', 'john']],
        schema: {
          fields: [
            {name: 'id', type: 'integer'},
            {name: 'name', type: 'string'},
          ],
        },
      })
      const rows = await dataPackage.resources[1].table.read()
      assert.deepEqual(rows, [[1, 'alex'], [2, 'john']])
    })

    it('add with not a safe path - throw an error', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const dataPackage = await Package.load(descriptor, {basePath: 'data/dp1'})
      try {
        dataPackage.addResource({
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
      const dataPackage = await Package.load(descriptor, {basePath: 'data/dp1'})
      const resource = dataPackage.getResource('random')
      assert.deepEqual(resource.name, 'random')
    })

    it('get non existent', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const dataPackage = await Package.load(descriptor, {basePath: 'data/dp1'})
      const resource = dataPackage.getResource('non-existent')
      assert.isNull(resource)
    })

    it('remove existent', async () => {
      const descriptor = require('../data/data-package-multiple-resources.json')
      const dataPackage = await Package.load(descriptor, {basePath: 'data'})
      assert.lengthOf(dataPackage.resources, 2)
      assert.lengthOf(dataPackage.descriptor.resources, 2)
      assert.deepEqual(dataPackage.resources[0].name, 'name1')
      assert.deepEqual(dataPackage.resources[1].name, 'name2')
      const resource = dataPackage.removeResource('name2')
      assert.lengthOf(dataPackage.resources, 1)
      assert.lengthOf(dataPackage.descriptor.resources, 1)
      assert.deepEqual(dataPackage.resources[0].name, 'name1')
      assert.deepEqual(resource.name, 'name2')
    })

    it('remove non existent', async () => {
      const descriptor = require('../data/dp1/datapackage.json')
      const dataPackage = await Package.load(descriptor, {basePath: 'data/dp1'})
      const resource = dataPackage.removeResource('non-existent')
      assert.isNull(resource)
      assert.lengthOf(dataPackage.resources, 1)
      assert.lengthOf(dataPackage.descriptor.resources, 1)
    })

  })

  describe('#save', () => {

    // TODO: recover stub with async writeFile
    it.skip('general', async function () {
      // TODO: check it trows correct error in browser
      if (process.env.USER_ENV === 'browser') {
        this.skip()
      }
      const descriptor = {resources: [{name: 'name', data: ['data']}]}
      const dataPackage = await Package.load(descriptor)
      const writeFile = sinon.stub(fs, 'writeFile')
      await dataPackage.save('target')
      writeFile.restore()
      sinon.assert.calledWith(writeFile,
        'target', JSON.stringify(expand(descriptor)))
    })

  })

  describe('#commit', () => {

    it('modified', async () => {
      const descriptor = {resources: [{name: 'name', data: ['data']}]}
      const dataPackage = await Package.load(descriptor)
      dataPackage.descriptor.resources[0].name = 'modified'
      assert.deepEqual(dataPackage.resources[0].name, 'name')
      const result = dataPackage.commit()
      assert.deepEqual(dataPackage.resources[0].name, 'modified')
      assert.isTrue(result)
    })

    it('modified invalid in strict mode', async () => {
      const descriptor = {resources: [{name: 'name', path: 'data.csv'}]}
      const dataPackage = await Package.load(descriptor, {
        basePath: 'data', strict: true,
      })
      dataPackage.descriptor.resources = []
      const error = await catchError(dataPackage.commit.bind(dataPackage), {})
      assert.instanceOf(error, Error)
      assert.instanceOf(error.errors[0], Error)
      assert.include(error.errors[0].message, 'Array is too short')
    })

    it('not modified', async () => {
      const descriptor = {resources: [{name: 'name', data: ['data']}]}
      const dataPackage = await Package.load(descriptor)
      const result = dataPackage.commit()
      assert.deepEqual(dataPackage.descriptor, expand(descriptor))
      assert.isFalse(result)
    })

  })

  describe('#foreignKeys', () => {
    const DESCRIPTOR = {
      resources: [
        {
          name: 'main',
          data: [
            ['id', 'name', 'surname', 'parent_id'],
            ['1', 'Alex', 'Martin', ''],
            ['2', 'John', 'Dockins', '1'],
            ['3', 'Walter', 'White', '2'],
          ],
          schema: {
            fields: [
              {name: 'id'},
              {name: 'name'},
              {name: 'surname'},
              {name: 'parent_id'},
            ],
            foreignKeys: [
              {
                fields: 'name',
                reference: {resource: 'people', fields: 'firstname'},
              },
            ],
          },
        }, {
          name: 'people',
          data: [
            ['firstname', 'surname'],
            ['Alex', 'Martin'],
            ['John', 'Dockins'],
            ['Walter', 'White'],
          ],
        },
      ],
    }

    it('should read rows if single field foreign keys is valid', async () => {
      const resource = (await Package.load(DESCRIPTOR)).getResource('main')
      const rows = await resource.read({relations: true})
      assert.deepEqual(rows, [
        ['1', {firstname: 'Alex', surname: 'Martin'}, 'Martin', null],
        ['2', {firstname: 'John', surname: 'Dockins'}, 'Dockins', '1'],
        ['3', {firstname: 'Walter', surname: 'White'}, 'White', '2'],
      ])
    })

    it('should throw on read if single field foreign keys is invalid', async () => {
      const descriptor = cloneDeep(DESCRIPTOR)
      descriptor.resources[1].data[2][0] = 'Max'
      const resource = (await Package.load(descriptor)).getResource('main')
      const error1 = await catchError(resource.read.bind(resource), {relations: true})
      const error2 = await catchError(resource.checkRelations.bind(resource))
      assert.include(error1.message, 'Foreign key')
      assert.include(error2.message, 'Foreign key')
    })

    it('should read rows if single self field foreign keys is valid', async () => {
      const descriptor = cloneDeep(DESCRIPTOR)
      descriptor.resources[0].schema.foreignKeys[0].fields = 'parent_id'
      descriptor.resources[0].schema.foreignKeys[0].reference.resource = ''
      descriptor.resources[0].schema.foreignKeys[0].reference.fields = 'id'
      const resource = (await Package.load(descriptor)).getResource('main')
      const keyedRows = await resource.read({keyed: true, relations: true})
      assert.deepEqual(keyedRows, [
        {
          id: '1',
          name: 'Alex',
          surname: 'Martin',
          parent_id: null,
        },
        {
          id: '2',
          name: 'John',
          surname: 'Dockins',
          parent_id: {id: '1', name: 'Alex', surname: 'Martin', parent_id: null},
        },
        {
          id: '3',
          name: 'Walter',
          surname: 'White',
          parent_id: {id: '2', name: 'John', surname: 'Dockins', parent_id: '1'},
        },
      ])
    })

    it('should throw on read if single self field foreign keys is invalid', async () => {
      const descriptor = cloneDeep(DESCRIPTOR)
      descriptor.resources[0].schema.foreignKeys[0].fields = 'parent_id'
      descriptor.resources[0].schema.foreignKeys[0].reference.resource = ''
      descriptor.resources[0].schema.foreignKeys[0].reference.fields = 'id'
      descriptor.resources[0].data[2][0] = '0'
      const resource = (await Package.load(descriptor)).getResource('main')
      const error1 = await catchError(resource.read.bind(resource), {relations: true})
      const error2 = await catchError(resource.checkRelations.bind(resource))
      assert.include(error1.message, 'Foreign key')
      assert.include(error2.message, 'Foreign key')
    })

    it('should read rows if multi field foreign keys is valid', async () => {
      const descriptor = cloneDeep(DESCRIPTOR)
      descriptor.resources[0].schema.foreignKeys[0].fields = ['name', 'surname']
      descriptor.resources[0].schema.foreignKeys[0].reference.fields = ['firstname', 'surname']
      const resource = (await Package.load(descriptor)).getResource('main')
      const keyedRows = await resource.read({keyed: true, relations: true})
      assert.deepEqual(keyedRows, [
        {
          id: '1',
          name: {firstname: 'Alex', surname: 'Martin'},
          surname: {firstname: 'Alex', surname: 'Martin'},
          parent_id: null,
        },
        {
          id: '2',
          name: {firstname: 'John', surname: 'Dockins'},
          surname: {firstname: 'John', surname: 'Dockins'},
          parent_id: '1',
        },
        {
          id: '3',
          name: {firstname: 'Walter', surname: 'White'},
          surname: {firstname: 'Walter', surname: 'White'},
          parent_id: '2',
        },
      ])
    })

    it('should throw on read if multi field foreign keys is invalid', async () => {
      const descriptor = cloneDeep(DESCRIPTOR)
      descriptor.resources[0].schema.foreignKeys[0].fields = ['name', 'surname']
      descriptor.resources[0].schema.foreignKeys[0].reference.fields = ['firstname', 'surname']
      descriptor.resources[1].data[2][0] = 'Max'
      const resource = (await Package.load(descriptor)).getResource('main')
      const error1 = await catchError(resource.read.bind(resource), {relations: true})
      const error2 = await catchError(resource.checkRelations.bind(resource))
      assert.include(error1.message, 'Foreign key')
      assert.include(error2.message, 'Foreign key')
    })

  })

  describe('#zip', () => {

    it('should load package from a zip', async function() {
      if (process.env.USER_ENV === 'browser') this.skip()
      const dp = await Package.load('data/dp3-zip.zip')
      const countries = await dp.getResource('countries').read({keyed: true})
      assert.deepEqual(dp.descriptor.name, 'abc')
      assert.deepEqual(countries, [
        {name: 'gb', size: 100},
        {name: 'us', size: 200},
        {name: 'cn', size: 300},
      ])
    })

    it('should save package as a zip', async function() {
      if (process.env.USER_ENV === 'browser') this.skip()

      // Save as a zip
      const dp = await Package.load('data/dp3-zip/datapackage.json')
      const target = await promisify(require('tmp').file)({postfix: '.zip'})
      const result = await dp.save(target)
      assert.ok(result)

      // Assert file names
      const zip = JSZip()
      await zip.loadAsync(promisify(fs.readFile)(target))
      assert.deepEqual(zip.file('datapackage.json').name, 'datapackage.json')
      assert.deepEqual(zip.file('data/countries.csv').name, 'data/countries.csv')

      // Assert contents
      const descContents = await zip.file('datapackage.json').async('string')
      const dataContents = await zip.file('data/countries.csv').async('string')
      assert.deepEqual(JSON.parse(descContents), dp.descriptor)
      assert.deepEqual(dataContents, 'name,size\ngb,100\nus,200\ncn,300\n')

    })

    it('should raise saving package as a zip to the bad path', async function() {
      if (process.env.USER_ENV === 'browser') this.skip()
      const dp = await Package.load('data/dp3-zip/datapackage.json')
      const error = await catchError(dp.save.bind(dp), 'non-existent/datapackage.zip')
      assert.include(error.message, 'no such file or directory')
      assert.include(error.message, 'non-existent/datapackage.zip')
    })

  })

})
