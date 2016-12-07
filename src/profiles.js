import tv4 from 'tv4'
import jsonlint from 'json-lint'
import _ from 'lodash'

import Registry from './registry'

class Profiles {

  constructor(remote = false) {
    this._registry = new Registry(remote)
    this.remote = remote
  }

  retrieve(profile) {
    return this._registry.get(profile)
  }

  validate(descriptor, profile = 'base') {
    let json = descriptor

    if (typeof descriptor === 'string') {
      let lint = jsonlint(descriptor)

      if (lint.error) {
        return new Promise((resolve, reject) => {
          reject(Error(lint.error.toString()))
        })
      }

      json = JSON.parse(descriptor)
    }

    if(_.isObject(profile) && !_.isArray(profile) && !_.isFunction(profile)) {
      return new Promise((resolve, reject) => {
        let valid = tv4.validateMultiple(json, profile)
        if (valid) {
          resolve(valid)
        }
        reject(Error(tv4.error))
      })
    }

    return new Promise((resolve, reject) => {
      this.retrieve(profile).then(schema => {
        let validation = tv4.validateMultiple(json, schema)
        if (!validation.errors) {
          resolve(true)
        }
        reject(Error(validation.errors))
      }).catch(err => {
        reject(Error(err))
      })
    })
  }
}

export default Profiles

/*Profiles.getRemoteRegistry(true).then((res) => {
  console.log(res)
}).catch((err) => {
  console.log(err)
})

new Profiles(false).retrieve('base').then((res) => {
  //console.log(res)
})*/

//new Profiles(true).retrieve('base').then(res => console.log(res))

new Profiles(true).validate('{ "g": \"a\"}', 'fiscal').then((res) => {
  console.log('resolved')
  console.log(res)
}).catch((err) => {
  console.log('rejected')
  console.log(err)
})