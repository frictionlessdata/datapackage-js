import 'babel-polyfill'
import fs from 'fs'
import { assert } from 'chai'
import _ from 'lodash'

import Datapackage from '../src/datapackage'

describe('Datapackage', () => {
  describe('#new Datapackage', () => {
    it('initializes with Object descriptor', async () => {
      const dp1 = fs.readFileSync('data/dp1/datapackage.json', 'utf8')
        , datapackage = await new Datapackage(JSON.parse(dp1))

      assert(_.isEqual(datapackage.descriptor, JSON.parse(dp1))
           , 'Datapackage descriptor not equal the provided descriptor')
    })

    it('initializes with URL descriptor', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')
          , dp1 = fs.readFileSync('data/dp1/datapackage.json', 'utf8')

      assert(_.isEqual(datapackage.descriptor, JSON.parse(dp1))
           , 'Datapackage descriptor not equal the provided descriptor')
    })

    it('throws errors if raiseInvalid is true for invalid datapackage', async () => {
      let error = null

      try {
        await new Datapackage({}, 'base', true, false)
      } catch (err) {
        error = err
      }

      assert(error instanceof Array)
    })

    it('stores the errors if raiseInvalid is false for invalid datapackage',
      async () => {
        const datapackage = await new Datapackage({}, 'base', false, false)
          , errors = datapackage.errors
          , valid = datapackage.valid

        assert(valid === false, 'valid getter should report false')
        assert(errors instanceof Array && errors.length > 0)
      })
  })

  describe('#update', () => {
    it('updates the descriptor', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')

      datapackage.update({ name: 'New Name' })

      assert(datapackage.descriptor.name === 'New Name', 'Datapackage not updated')
    })

    it('throws array of errors if updating does not validate', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')

      try {
        datapackage.update({ resources: 'not array' })
        assert(false, 'Datapackage was not properly validated')
      } catch (err) {
        assert(err instanceof Array, 'Invalid rejection')
      }
    })

    it('keeps the valid descriptor if update is not successful', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')

      try {
        datapackage.update({ resources: 'not array' })
        assert(false, 'invalid descriptor updated')
      } catch (err) {
        assert(datapackage.descriptor.resources instanceof Array)
      }
    })

    it('throws array of errors if the user is altering the resources', async () => {
      const datapackage = await new Datapackage('data/dp2-tabular/datapackage.json')

      try {
        datapackage.update({ resources: [{ name: 'new resource' }] })
        assert(false, 'Updating the resources should reject')
      } catch (err) {
        assert(err instanceof Array, 'Promise not rejected with Array')
      }
    })

    it('silently adds the errors if the descriptor is invalid and if raiseInvalid is false', async () => {
      const datapackage = await new Datapackage('data/dp2-tabular/datapackage.json', 'base', false)

      try {
        const validation = datapackage.update({ resources: 'not array' })
        assert(validation === false, 'Did not returned false on invalid update')
        assert(datapackage.errors.length > 0)
        assert(datapackage.valid === false, 'Datapackage should not be valid')
      } catch (err) {
        assert(false, 'Update rejected when `raiseInvalid` is set to false')
      }
    })
  })

  describe('#addResource', () => {
    it('adds resource', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')

      const validation = datapackage.addResource({ data: 'test' })
      assert(validation, `addResource returned ${typeof validation}`)
      assert(datapackage.resources.length === 2, 'Resource missing from resources getter')
      assert(datapackage.descriptor.resources[1].data === 'test', 'Test resource property not found')
    })

    it('doesn\'t add the same resource twice', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')
          , dp1 = fs.readFileSync('data/dp1/datapackage.json', 'utf8')

      try {
        datapackage.addResource(JSON.parse(dp1).resources[0])
        assert(datapackage.resources.length === 1, 'Added duplicate resource')
      } catch (err) {
        assert(false, err.join())
      }
    })

    it('rejects with Array of errors if resource is invalid', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json')

      try {
        datapackage.addResource({})
      } catch (err) {
        assert(err instanceof Array, 'Rejected with non Array value')
        assert(err.length === 1, 'Array contains more errors')
      }
    })

    it('silently adds the errors and marks package as invalid when raiseInvalid is `false`', async () => {
      const datapackage = await new Datapackage('data/dp1/datapackage.json', 'base', false)

      const validation = datapackage.addResource({})
      assert(validation === false, 'Package not marked as invalid')
      assert(datapackage.errors.length > 0, 'Validation errors not added')
    })
  })
})
