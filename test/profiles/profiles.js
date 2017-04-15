import axios from 'axios'
import {should} from 'chai'
const registry = require('../../src/profiles/registry.json')
const dataPackage = require('../../src/profiles/data-package.json')
const tabularDataPackage = require('../../src/profiles/tabular-data-package.json')
const fiscalDataPackage = require('../../src/profiles/fiscal-data-package.json')
should()

// Tests

describe('profiles', () => {

  it('registry should be up-to-date', async () => {
    const res = await axios.get('https://specs.frictionlessdata.io/schemas/registry.json')
    registry.should.deep.equal(res.data)
  })

  it('data-package should be up-to-date', async () => {
    const res = await axios.get('https://specs.frictionlessdata.io/schemas/data-package.json')
    dataPackage.should.deep.equal(res.data)
  })

  it('tabular-data-package should be up-to-date', async () => {
    const res = await axios.get('https://specs.frictionlessdata.io/schemas/tabular-data-package.json')
    tabularDataPackage.should.deep.equal(res.data)
  })

  it('fiscal-data-package should be up-to-date', async () => {
    const res = await axios.get('https://specs.frictionlessdata.io/schemas/fiscal-data-package.json')
    fiscalDataPackage.should.deep.equal(res.data)
  })

})
