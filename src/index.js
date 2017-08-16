require('babel-polyfill')
const {Package} = require('./package')
const {Resource} = require('./resource')
const {Profile} = require('./resource')
const {validate} = require('./validate')
const {infer} = require('./infer')
const errors = require('./errors')


// Module API

module.exports = {
  Package,
  Resource,
  Profile,
  validate,
  infer,
  errors,
}
