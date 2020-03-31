const { assert } = require('chai')
const { infer } = require('../src')

// Tests

describe('infer', () => {
  it('it infers local data package', async function () {
    if (process.env.USER_ENV === 'browser') this.skip()
    const descriptor = await infer('**/*.csv', { basePath: 'data/dp1' })
    assert.deepEqual(descriptor.profile, 'tabular-data-package')
    assert.deepEqual(descriptor.resources.length, 1)
    assert.deepEqual(descriptor.resources[0].path, 'data.csv')
    assert.deepEqual(descriptor.resources[0].format, 'csv')
    assert.deepEqual(descriptor.resources[0].encoding, 'utf-8')
    assert.deepEqual(descriptor.resources[0].profile, 'tabular-data-resource')
    assert.deepEqual(descriptor.resources[0].schema.fields[0].name, 'name')
    assert.deepEqual(descriptor.resources[0].schema.fields[1].name, 'size')
  })
})
