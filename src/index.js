require('babel-polyfill')
const DataPackage = require('./datapackage').DataPackage
const Resource = require('./resource').Resource
const Profile = require('./resource').Profile
const validate = require('./validate').validate

// Module API

export default {DataPackage, Resource, Profile, validate}
export {DataPackage, Resource, Profile, validate}
