const fs = require('fs')
const axios = require('axios')
const lodash = require('lodash')
const urljoin = require('url-join')
const jsonpointer = require('json-pointer')
const config = require('./config')


// Locate descriptor

function locateDescriptor(descriptor) {
  if (lodash.isString(descriptor)) {
    return descriptor.split('/').slice(0, -1).join('/') || '.'
  }
  return null
}


// Retrieve descriptor

async function retrieveDescriptor(descriptor) {
  if (lodash.isPlainObject(descriptor)) {
    return lodash.cloneDeep(descriptor)
  }
  if (lodash.isString(descriptor)) {

    // Remote
    if (isRemotePath(descriptor)) {
      try {
        const response = await axios.get(descriptor)
        return response.data
      } catch (error) {
        throw new Error(`Can not retrieve remote descriptor "${descriptor}"`)
      }

    // Local
    } else {
      if (process.env.USER_ENV === 'browser') {
        throw new Error(`Local descriptor "${descriptor}" in browser is not supported`)
      }
      try {
        // TODO: rebase on promisified fs.readFile (async)
        const contents = fs.readFileSync(descriptor, 'utf-8')
        return JSON.parse(contents)
      } catch (error) {
        throw new Error(`Can not retrieve local descriptor "${descriptor}"`)
      }
    }

  }
  throw new Error('Descriptor must be String or Object')
}


// Dereference descriptor

async function dereferenceDataPackageDescriptor(descriptor, basePath) {
  descriptor = lodash.cloneDeep(descriptor)
  for (const [index, resource] of (descriptor.resources || []).entries()) {
    // TODO: May be we should use Promise.all here
    descriptor.resources[index] = await dereferenceResourceDescriptor(
        resource, basePath, descriptor)
  }
  return descriptor
}


async function dereferenceResourceDescriptor(descriptor, basePath, baseDescriptor) {
  descriptor = lodash.cloneDeep(descriptor)
  baseDescriptor = baseDescriptor || descriptor
  const PROPERTIES = ['schema', 'dialect']
  for (const property of PROPERTIES) {
    const value = descriptor[property]

    // URI -> No
    if (!lodash.isString(value)) {
      continue

    // URI -> Pointer
    } else if (value.startsWith('#')) {
      try {
        descriptor[property] = jsonpointer.get(baseDescriptor, value.slice(1))
      } catch (error) {
        throw new Error(`Not resolved Pointer URI "${value}" for resource.${property}`)
      }

    // URI -> Remote
    // TODO: remote base path also will lead to remote case!
    } else if (isRemotePath(value)) {
      try {
        const response = await axios.get(value)
        descriptor[property] = response.data
      } catch (error) {
        throw new Error(`Not resolved Remote URI "${value}" for resource.${property}`)
      }

    // URI -> Local
    } else {
      if (process.env.USER_ENV === 'browser') {
        throw new Error('Local URI dereferencing in browser is not supported')
      }
      if (!isSafePath(value)) {
        throw new Error(`Not safe path in Local URI "${value}" for resource.${property}`)
      }
      if (!basePath) {
        throw new Error(`Local URI "${value}" requires base path for resource.${property}`)
      }
      try {
        // TODO: support other that Unix OS
        const fullPath = [basePath, value].join('/')
        // TODO: rebase on promisified fs.readFile (async)
        const contents = fs.readFileSync(fullPath, 'utf-8')
        descriptor[property] = JSON.parse(contents)
      } catch (error) {
        throw new Error(`Not resolved Local URI "${value}" for resource.${property}`)
      }

    }
  }

  return descriptor
}


// Expand descriptor

function expandDataPackageDescriptor(descriptor) {
  descriptor = lodash.cloneDeep(descriptor)
  descriptor.profile = descriptor.profile || config.DEFAULT_DATA_PACKAGE_PROFILE
  for (const [index, resource] of (descriptor.resources || []).entries()) {
    descriptor.resources[index] = expandResourceDescriptor(resource)
  }
  return descriptor
}


function expandResourceDescriptor(descriptor) {
  descriptor = lodash.cloneDeep(descriptor)
  descriptor.profile = descriptor.profile || config.DEFAULT_RESOURCE_PROFILE
  descriptor.encoding = descriptor.encoding || config.DEFAULT_RESOURCE_ENCODING
  if (descriptor.profile === 'tabular-data-resource') {

    // Schema
    const schema = descriptor.schema
    if (schema !== undefined) {
      for (const field of (schema.fields || [])) {
        field.type = field.type || config.DEFAULT_FIELD_TYPE
        field.format = field.format || config.DEFAULT_FIELD_FORMAT
      }
      schema.missingValues = schema.missingValues || config.DEFAULT_MISSING_VALUES
    }

    // Dialect
    const dialect = descriptor.dialect
    if (dialect !== undefined) {
      for (const [key, value] of Object.entries(config.DEFAULT_DIALECT)) {
        if (!dialect.hasOwnProperty(key)) {
          dialect[key] = value
        }
      }
    }
  }
  return descriptor
}


// Write descriptor

async function writeDescriptor(descriptor, path) {
  if (process.env.USER_ENV === 'browser') {
    throw new Error('Writing descriptor on disk in browser is not supported')
  }
  // TODO: rebase on async function
  fs.writeFileSync(path, JSON.stringify(descriptor))
}


// Miscellaneous

function isRemotePath(path) {
  // TODO: improve implementation
  return path.startsWith('http')
}


function isSafePath(path) {
  // TODO: support not only Unix
  // Even for safe path always join with basePath!
  if (path.startsWith('/')) {
    return false
  }
  if (path.includes('../') || path.includes('..\\')) {
    return false
  }
  return true
}


function joinUrl(...parts) {
  return urljoin(...parts)
}


module.exports = {
  locateDescriptor,
  retrieveDescriptor,
  dereferenceDataPackageDescriptor,
  dereferenceResourceDescriptor,
  expandDataPackageDescriptor,
  expandResourceDescriptor,
  writeDescriptor,
  isRemotePath,
  isSafePath,
  joinUrl,
}
