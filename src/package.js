const fs = require('fs')
const JSZip = require('jszip')
const isEqual = require('lodash/isEqual')
const isString = require('lodash/isString')
const isBoolean = require('lodash/isBoolean')
const cloneDeep = require('lodash/cloneDeep')
const isUndefined = require('lodash/isUndefined')
const { promisify } = require('util')
const { Profile } = require('./profile')
const { Resource } = require('./resource')
const { DataPackageError } = require('./errors')
const helpers = require('./helpers')
const config = require('./config')

// Module API

/**
 * Package representation
 */
class Package {
  // Public

  /**
   * Factory method to instantiate `Package` class.
   *
   * This method is async and it should be used with await keyword or as a `Promise`.
   *
   * @param {string|Object} descriptor - package descriptor as local path, url or object.
   *   If ththe path has a `zip` file extension it will be unzipped
   *   to the temp directory first.
   * @param {string} basePath - base path for all relative paths
   * @param {boolean} strict - strict flag to alter validation behavior.
   *   Setting it to `true` leads to throwing errors on any operation
   *   with invalid descriptor
   * @throws {DataPackageError} raises error if something goes wrong
   * @returns {Package} returns data package class instance
   */
  static async load(descriptor = {}, { basePath, strict = false } = {}) {
    // Extract zip
    // TODO:
    // it's first iteration of the zip loading implementation
    // for now browser support and tempdir cleanup (not needed?) is not covered
    if (isString(descriptor) && descriptor.endsWith('.zip')) {
      descriptor = await extractZip(descriptor)
    }

    // Get base path
    if (isUndefined(basePath)) {
      basePath = helpers.locateDescriptor(descriptor)
    }

    // Process descriptor
    descriptor = await helpers.retrieveDescriptor(descriptor)
    descriptor = await helpers.dereferencePackageDescriptor(descriptor, basePath)

    // Get profile
    const profile = await Profile.load(descriptor.profile || config.DEFAULT_DATA_PACKAGE_PROFILE)

    return new Package(descriptor, { basePath, strict, profile })
  }

  /**
   * Validation status
   *
   * It always `true` in strict mode.
   *
   * @returns {Boolean} returns validation status
   */
  get valid() {
    return this._errors.length === 0 && this.resources.every((resource) => resource.valid)
  }

  /**
   * Validation errors
   *
   * It always empty in strict mode.
   *
   * @returns {Error[]} returns validation errors
   */
  get errors() {
    const errors = cloneDeep(this._errors)
    for (const [index, resource] of this.resources.entries()) {
      if (!resource.valid) {
        errors.push(new Error(`Resource "${resource.name || index}" validation error(s)`))
      }
    }
    return errors
  }

  /**
   * Profile
   *
   * @returns {Profile}
   */
  get profile() {
    return this._profile
  }

  /**
   * Descriptor
   *
   * @returns {Object} schema descriptor
   */
  get descriptor() {
    // Never use this.descriptor inside this class (!!!)
    return this._nextDescriptor
  }

  /**
   * Resources
   *
   * @returns {Resoruce[]}
   */
  get resources() {
    return this._resources
  }

  /**
   * Resource names
   *
   * @returns {string[]}
   */
  get resourceNames() {
    return this._resources.map((resource) => resource.name)
  }

  /**
   * Return a resource
   *
   * @param {string} name
   * @returns {Resource|null} resource instance if exists
   */
  getResource(name) {
    return this._resources.find((resource) => resource.name === name) || null
  }

  /**
   * Add a resource
   *
   * @param {Object} descriptor
   * @returns {Resource} added resource instance
   */
  addResource(descriptor) {
    if (!this._currentDescriptor.resources) this._currentDescriptor.resources = []
    this._currentDescriptor.resources.push(descriptor)
    this._build()
    return this._resources[this._resources.length - 1]
  }

  /**
   * Remove a resource
   *
   * @param {string} name
   * @returns {(Resource|null)} removed resource instance if exists
   */
  removeResource(name) {
    const resource = this.getResource(name)
    if (resource) {
      const predicat = (resource) => resource.name !== name
      this._currentDescriptor.resources = this._currentDescriptor.resources.filter(predicat)
      this._build()
    }
    return resource
  }

  /**
   * Infer metadata
   *
   * @param {string} pattern
   * @returns {Object}
   */
  async infer(pattern = false) {
    // Files
    if (pattern) {
      // It's broswer
      if (config.IS_BROWSER) {
        throw new DataPackageError('Browser is not supported for pattern infer')
      }

      // No base path
      if (!this._basePath) {
        throw new DataPackageError('Base path is required for pattern infer')
      }

      // Add resources
      const files = await findFiles(pattern, this._basePath)
      for (const file of files) {
        this.addResource({ path: file })
      }
    }

    // Resources
    for (const [index, resource] of this.resources.entries()) {
      const descriptor = await resource.infer()
      this._currentDescriptor.resources[index] = descriptor
      this._build()
    }

    // Profile
    if (this._nextDescriptor.profile === config.DEFAULT_DATA_PACKAGE_PROFILE) {
      if (this.resources.length && this.resources.every((resouce) => resouce.tabular)) {
        this._currentDescriptor.profile = 'tabular-data-package'
        this._build()
      }
    }

    return this._currentDescriptor
  }

  /**
   * Update package instance if there are in-place changes in the descriptor.
   *
   * @example
   *
   * ```javascript
   * const dataPackage = await Package.load({
   *     name: 'package',
   *     resources: [{name: 'resource', data: ['data']}]
   * })
   *
   * dataPackage.name // package
   * dataPackage.descriptor.name = 'renamed-package'
   * dataPackage.name // package
   * dataPackage.commit()
   * dataPackage.name // renamed-package
   * ```
   *
   * @param {boolean} strict - alter `strict` mode for further work
   * @throws {DataPackageError} raises any error occurred in the process
   * @returns {Boolean} returns true on success and false if not modified
   */
  commit({ strict } = {}) {
    if (isBoolean(strict)) this._strict = strict
    else if (isEqual(this._currentDescriptor, this._nextDescriptor)) return false
    this._currentDescriptor = cloneDeep(this._nextDescriptor)
    this._build()
    return true
  }

  /**
   * Save data package to target destination.
   *
   * If target path has a  zip file extension the package will be zipped and
   * saved entirely. If it has a json file extension only the descriptor will be saved.
   *
   * @param {string} target - path where to save a data package
   * @param {DataPackageError} raises error if something goes wrong
   * @param {boolean} returns true on success
   */
  save(target) {
    return new Promise((resolve, reject) => {
      // Save descriptor to json
      if (target.endsWith('.json')) {
        const contents = JSON.stringify(this._currentDescriptor, null, 4)
        fs.writeFile(target, contents, (error) => (!error ? resolve() : reject(error)))

        // Save package to zip
      } else {
        // Not supported in browser
        if (config.IS_BROWSER) {
          throw new DataPackageError('Zip is not supported in browser')
        }

        // Prepare zip
        const zip = new JSZip()
        const descriptor = cloneDeep(this._currentDescriptor)
        for (const [index, resource] of this.resources.entries()) {
          if (!resource.name) continue
          if (!resource.local) continue
          let path = `data/${resource.name}`
          const format = resource.descriptor.format
          if (format) path = `${path}.${format.toLowerCase()}`
          descriptor.resources[index].path = path
          zip.file(path, resource.rawRead())
        }
        zip.file('datapackage.json', JSON.stringify(descriptor, null, 4))

        // Write zip
        zip
          .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
          .pipe(fs.createWriteStream(target).on('error', (error) => reject(error)))
          .on('error', (error) => reject(error))
          .on('finish', () => resolve(true))
      }
    })
  }

  // Private

  constructor(descriptor, { basePath, strict, profile } = {}) {
    // Handle deprecated resource.path.url
    for (const resource of descriptor.resources || []) {
      if (resource.url) {
        console.warn(
          `Resource property "url: <url>" is deprecated.
           Please use "path: <url>" instead.`
        )
        resource.path = resource.url
        delete resource.url
      }
    }

    // Set attributes
    this._currentDescriptor = cloneDeep(descriptor)
    this._nextDescriptor = cloneDeep(descriptor)
    this._basePath = basePath
    this._strict = strict
    this._profile = profile
    this._resources = []
    this._errors = []

    // Build package
    this._build()
  }

  _build() {
    // Process descriptor
    this._currentDescriptor = helpers.expandPackageDescriptor(this._currentDescriptor)
    this._nextDescriptor = cloneDeep(this._currentDescriptor)

    // Validate descriptor
    this._errors = []
    const { valid, errors } = this._profile.validate(this._currentDescriptor)
    if (!valid) {
      this._errors = errors
      if (this._strict) {
        const message = `There are ${errors.length} validation errors (see 'error.errors')`
        throw new DataPackageError(message, errors)
      }
    }

    // Update resources
    this._resources.length = (this._currentDescriptor.resources || []).length
    for (const [index, descriptor] of (this._currentDescriptor.resources || []).entries()) {
      const resource = this._resources[index]
      if (
        !resource ||
        !isEqual(resource.descriptor, descriptor) ||
        (resource.schema && resource.schema.foreignKeys.length)
      ) {
        this._resources[index] = new Resource(descriptor, {
          strict: this._strict,
          basePath: this._basePath,
          dataPackage: this,
        })
      }
    }
  }
}

// Internal

async function extractZip(descriptor) {
  // Not supported in browser
  if (config.IS_BROWSER) {
    throw new DataPackageError('Zip is not supported in browser')
  }

  // Load zip
  const zip = JSZip()
  const tempdir = await promisify(require('tmp').dir)()
  await zip.loadAsync(promisify(fs.readFile)(descriptor))

  // Validate zip
  if (!zip.files['datapackage.json']) {
    throw new DataPackageError('Invalid zip with data package')
  }

  // Save zip to tempdir
  for (const [name, item] of Object.entries(zip.files)) {
    // Get path/descriptor
    const path = `${tempdir}/${name}`
    if (path.endsWith('datapackage.json')) {
      descriptor = path
    }

    // Directory
    if (item.dir) {
      await promisify(fs.mkdir)(path)

      // File
    } else {
      const contents = await item.async('nodebuffer')
      await promisify(fs.writeFile)(path, contents)
    }
  }

  return descriptor
}

function findFiles(pattern, basePath) {
  const glob = require('glob')
  return new Promise((resolve, reject) => {
    const options = { cwd: basePath, ignore: 'node_modules/**' }
    glob(pattern, options, (error, files) => {
      if (error) reject(error)
      resolve(files)
    })
  })
}

// System

module.exports = {
  Package,
}
