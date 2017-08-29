const tableschema = require('tableschema')


// Module API

const DataPackageError = tableschema.errors.DataPackageError
const TableSchemaError = tableschema.errors.TableSchemaError


// System

module.exports = {
  DataPackageError,
  TableSchemaError,
}
