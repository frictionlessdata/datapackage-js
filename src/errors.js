const tableschema = require('tableschema')
const ExtendableError = require('es6-error')


// Module API

class DataPackageError extends ExtendableError {

  // Public

  /**
   * https://github.com/frictionlessdata/tableschema-js#errors
   */
  constructor(message, errors=[]) {
    super(message)
    this._errors = errors
  }

  /**
   * https://github.com/frictionlessdata/tableschema-js#errors
   */
  get multiple() {
    return !!this._errors.length
  }

  /**
   * https://github.com/frictionlessdata/tableschema-js#errors
   */
  get errors() {
    return this._errors
  }

}


const TableSchemaError = tableschema.errors.TableSchemaError
Object.setPrototypeOf(TableSchemaError.prototype, DataPackageError.prototype)


// System

module.exports = {
  DataPackageError,
  TableSchemaError,
}
