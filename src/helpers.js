const fs = require('fs')
const axios = require('axios')
const pathModule = require('path')
const isString = require('lodash/isString')
const cloneDeep = require('lodash/cloneDeep')
const isPlainObject = require('lodash/isPlainObject')
const jsonpointer = require('json-pointer')
const { DataPackageError } = require('./errors')
const config = require('./config')
const omit = require('lodash/omit')

// Locate descriptor

function locateDescriptor(descriptor) {
  let basePath

  // Infer from path/url
  if (isString(descriptor)) {
    basePath = descriptor.split('/').slice(0, -1).join('/') || '.'

    // Current dir by default
  } else {
    basePath = '.'
  }

  return basePath
}

// Retrieve descriptor

async function retrieveDescriptor(descriptor) {
  if (isPlainObject(descriptor)) {
    return cloneDeep(descriptor)
  }
  if (isString(descriptor)) {
    // Remote
    if (isRemotePath(descriptor)) {
      try {
        const response = await axios.get(descriptor)
        return response.data
      } catch (error) {
        const message = `Can not retrieve remote descriptor "${descriptor}"`
        throw new DataPackageError(message)
      }

      // Local
    } else {
      if (config.IS_BROWSER) {
        const message = `Local descriptor "${descriptor}" in browser is not supported`
        throw new DataPackageError(message)
      }
      try {
        // TODO: rebase on promisified fs.readFile (async)
        const contents = fs.readFileSync(descriptor, 'utf-8')
        return JSON.parse(contents)
      } catch (error) {
        const message = `Can not retrieve local descriptor "${descriptor}"`
        throw new DataPackageError(message)
      }
    }
  }
  throw new DataPackageError('Descriptor must be String or Object')
}

// Dereference descriptor

async function dereferencePackageDescriptor(descriptor, basePath) {
  descriptor = cloneDeep(descriptor)
  for (const [index, resource] of (descriptor.resources || []).entries()) {
    // TODO: May be we should use Promise.all here
    descriptor.resources[index] = await dereferenceResourceDescriptor(
      resource,
      basePath,
      descriptor
    )
  }
  return descriptor
}

async function dereferenceResourceDescriptor(descriptor, basePath, baseDescriptor) {
  descriptor = cloneDeep(descriptor)
  baseDescriptor = baseDescriptor || descriptor
  const PROPERTIES = ['schema', 'dialect']
  for (const property of PROPERTIES) {
    let value = descriptor[property]

    // URI -> No
    if (!isString(value)) {
      continue

      // URI -> Pointer
    } else if (value.startsWith('#')) {
      try {
        descriptor[property] = jsonpointer.get(baseDescriptor, value.slice(1))
      } catch (error) {
        const message = `Not resolved Pointer URI "${value}" for resource.${property}`
        throw new DataPackageError(message)
      }

      // URI -> Remote
    } else {
      if (basePath && isRemotePath(basePath)) {
        // TODO: support other that Unix OS
        value = [basePath, value].join('/')
      }
      if (isRemotePath(value)) {
        try {
          const response = await axios.get(value)
          descriptor[property] = response.data
        } catch (error) {
          const message = `Not resolved Remote URI "${value}" for resource.${property}`
          throw new DataPackageError(message)
        }

        // URI -> Local
      } else {
        if (config.IS_BROWSER) {
          const message = 'Local URI dereferencing in browser is not supported'
          throw new DataPackageError(message)
        }
        if (!isSafePath(value)) {
          const message = `Not safe path in Local URI "${value}" for resource.${property}`
          throw new DataPackageError(message)
        }
        if (!basePath) {
          const message = `Local URI "${value}" requires base path for resource.${property}`
          throw new DataPackageError(message)
        }
        try {
          // TODO: support other that Unix OS
          const fullPath = [basePath, value].join('/')
          // TODO: rebase on promisified fs.readFile (async)
          const contents = fs.readFileSync(fullPath, 'utf-8')
          descriptor[property] = JSON.parse(contents)
        } catch (error) {
          const message = `Not resolved Local URI "${value}" for resource.${property}`
          throw new DataPackageError(message)
        }
      }
    }
  }

  return descriptor
}

// Expand descriptor

function expandPackageDescriptor(descriptor) {
  descriptor = cloneDeep(descriptor)
  descriptor.profile = descriptor.profile || config.DEFAULT_DATA_PACKAGE_PROFILE
  for (const [index, resource] of (descriptor.resources || []).entries()) {
    descriptor.resources[index] = expandResourceDescriptor(resource)
  }
  return descriptor
}

function expandResourceDescriptor(descriptor) {
  descriptor = cloneDeep(descriptor)
  descriptor.profile = descriptor.profile || config.DEFAULT_RESOURCE_PROFILE
  descriptor.encoding = descriptor.encoding || config.DEFAULT_RESOURCE_ENCODING
  if (descriptor.profile === 'tabular-data-resource') {
    // Schema
    const schema = descriptor.schema
    if (schema !== undefined) {
      for (const field of schema.fields || []) {
        field.type = field.type || config.DEFAULT_FIELD_TYPE
        field.format = field.format || config.DEFAULT_FIELD_FORMAT
      }
      schema.missingValues = schema.missingValues || config.DEFAULT_MISSING_VALUES
    }

    // Dialect
    const dialect = descriptor.dialect
    if (dialect !== undefined) {
      for (const [key, value] of Object.entries(filterDefaultDialect(validateDialect(dialect)))) {
        if (!dialect.hasOwnProperty(key)) {
          dialect[key] = value
        }
      }
    }
  }
  return descriptor
}

// Miscellaneous

// quoteChar and escapeChar are mutually exclusive: https://frictionlessdata.io/specs/csv-dialect/#specification
function filterDefaultDialect(dialect = {}) {
  const defaultDialects = dialect.hasOwnProperty('escapeChar')
    ? omit(config.DEFAULT_DIALECT, 'quoteChar')
    : config.DEFAULT_DIALECT
  return defaultDialects
}

// quoteChar and escapeChar are mutually exclusive: https://frictionlessdata.io/specs/csv-dialect/#specification
function validateDialect(dialect = {}) {
  if (dialect.hasOwnProperty('escapeChar') && dialect.hasOwnProperty('quoteChar')) {
    throw new DataPackageError(
      'Resource.table dialect options quoteChar and escapeChar are mutually exclusive.'
    )
  }
  return dialect
}

function isRemotePath(path) {
  // TODO: improve implementation
  return path.startsWith('http')
}

function isSafePath(path) {
  const containsWindowsVar = (path) => path.match(/%.+%/)
  const containsPosixVar = (path) => path.match(/\$.+/)

  // Safety checks
  const unsafenessConditions = [
    pathModule.isAbsolute(path),
    path.includes(`..${pathModule.sep}`),
    path.startsWith('~'),
    containsWindowsVar(path),
    containsPosixVar(path),
  ]

  return !unsafenessConditions.some(Boolean)
}

// System

module.exports = {
  locateDescriptor,
  retrieveDescriptor,
  dereferencePackageDescriptor,
  dereferenceResourceDescriptor,
  expandPackageDescriptor,
  expandResourceDescriptor,
  validateDialect,
  isRemotePath,
  isSafePath,
}
