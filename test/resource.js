'use strict'

import { assert } from 'chai'
import Resource from '../src/resource'

describe('Resource', () => {
  it('Should export resource', () => {
    assert(Resource, 'resource variable is empty')
  })
})
