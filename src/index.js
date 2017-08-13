require('babel-polyfill')
const {DataPackage} = require('./datapackage')
const {Resource} = require('./resource')
const {Profile} = require('./resource')
const {validate} = require('./validate')
const {infer} = require('./infer')


// Module API

module.exports = {
  DataPackage,
  Resource,
  Profile,
  validate,
  infer,
}
