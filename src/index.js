require('regenerator-runtime/runtime')
const { Package } = require('./package')
const { Resource } = require('./resource')
const { Profile } = require('./profile')
const { validate } = require('./validate')
const { infer } = require('./infer')
const { DataPackageError } = require('./errors')
const { TableSchemaError } = require('./errors')

// Module API

module.exports = {
  Package,
  Resource,
  Profile,
  validate,
  infer,
  DataPackageError,
  TableSchemaError,

  // Deprecated
  errors: {
    DataPackageError,
    TableSchemaError,
  },
}
