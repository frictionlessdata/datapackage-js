const tableschema = require('tableschema')

// Module API

/**
 * Base class for the all DataPackage errors.
 */
const DataPackageError = tableschema.errors.DataPackageError

/**
 * Base class for the all TableSchema errors.
 */
const TableSchemaError = tableschema.errors.TableSchemaError

// System

module.exports = {
  DataPackageError,
  TableSchemaError,
}
