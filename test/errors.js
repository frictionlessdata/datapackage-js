const {assert} = require('chai')
const tableschema = require('tableschema')
const {DataPackageError} = require('../src/errors')


// Tests


describe('DataPackageError', () => {

  it('should work with one error', () => {
    const error = new DataPackageError('message')
    assert.deepEqual(error.message, 'message')
    assert.deepEqual(error.multiple, false)
    assert.deepEqual(error.errors, [])
  })

  it('should work with multiple errors', () => {
    const errors = [new Error('error1'), new Error('error2')]
    const error = new DataPackageError('message', errors)
    assert.deepEqual(error.message, 'message')
    assert.deepEqual(error.multiple, true)
    assert.deepEqual(error.errors.length, 2)
    assert.deepEqual(error.errors[0].message, 'error1')
    assert.deepEqual(error.errors[1].message, 'error2')
  })

  it('should be catchable as a normal error', () => {
    try {
      throw new DataPackageError('message')
    } catch (error) {
      assert.deepEqual(error.message, 'message')
      assert.deepEqual(error instanceof Error, true)
      assert.deepEqual(error instanceof DataPackageError, true)
    }
  })

  it('should work with table schema error', () => {
    try {
      throw new tableschema.errors.TableSchemaError('message')
    } catch (error) {
      assert.deepEqual(error.message, 'message')
      assert.deepEqual(error instanceof Error, true)
      assert.deepEqual(error instanceof DataPackageError, true)
      assert.deepEqual(error instanceof tableschema.errors.TableSchemaError, true)
    }
  })

})
