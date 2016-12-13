import { spawnSync } from 'child_process'
import { assert } from 'chai'

describe('Schemas', () => {
  it('are up to date', () => {
    const checkSchemas = spawnSync('npm', ['run', 'check-schemas'])
        , status = checkSchemas.status

    assert(status === 0,
           'New registry available. Run "npm run update-schemas" to update.')
  })
})
