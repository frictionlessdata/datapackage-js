import 'isomorphic-fetch'
import _ from 'lodash'
import path from 'path'


// Internal

let fs
const isBrowser = typeof window !== 'undefined'
if (!isBrowser) {
  fs = require('fs')
}


// Module API

export default class Utils {

  // Public

  /**
   * Checks if the provided path is a remote URL
   *
   * @param pathOrURL
   * @return {Array|null}
   */
  static isRemoteURL(pathOrURL) {
    if (pathOrURL.constructor === String) {
      return pathOrURL.match(/\w+:\/\/.+/)
    }

    return false
  }

  /**
   * Check if we're running in browser.
   *
   * @return {boolean}
   */
  static get isBrowser() {
    return isBrowser
  }

  /**
   * Given path to a file, read the contents of the file.
   *
   * @param pathOrURL {String}
   * @return {Promise}
   */
  static readFileOrURL(pathOrURL) {
    function _readURL(_url) {
      return fetch(_url)
        .then(response => {
          if (!response.ok) {
            throw new Error('Bad response from server')
          }

          return response.text()
        })
    }

    function _readFile(localPath) {
      // WARN: This only works on NodeJS
      return new Promise((resolve, reject) => {
        fs.readFile(localPath, 'utf8', (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        })
      })
    }

    let result

    if (isBrowser || Utils.isRemoteURL(pathOrURL)) {
      result = _readURL(pathOrURL)
    } else {
      result = _readFile(pathOrURL)
    }

    return result
  }

  /**
   * Given Error or Array of Errors, convert it to Array with Strings containing
   * the Error message(s).
   *
   * @param values
   * @return {Array}
   */
  static errorsToStringArray(values) {
    const result = []
    _.forEach(values, error => {
      let errorMessage = error.message
      if (error.dataPath) {
        errorMessage += ` in "${error.dataPath}"`
      }
      if (error.schemaPath) {
        errorMessage += ` schema path: "${error.schemaPath}"`
      }
      result.push(errorMessage)
    })
    return result
  }

  /**
   * Loads the base path (dirname) of the path.
   *
   * @param pathOrURL
   * @return {String|null}
   */
  static getDirname(pathOrURL) {
    if (!Utils.isBrowser && !Utils.isRemoteURL(pathOrURL)) {
      return path.dirname(path.resolve(pathOrURL))
    }
    return null
  }

  /**
   * Checks if the path is valid (or starts with '.' or '/' or contains '..')
   *
   * @param {String} pathOrURL
   * @return {boolean} true for valid path and false for invalid path
   */
  static checkPath(pathOrURL) {
    /**
     * Helper function to search for '..' occurrences.
     *
     * @param sourcePath
     * @returns {Array} Empty array if path is legal or array of validating errors
     */
    function checkForDotDot(sourcePath) {
      if (Utils.isRemoteURL(sourcePath)) {
        // URLs can contain dot dot
        return []
      }

      const dotdotFound = _.find(sourcePath.replace('\\', '').split('/'), dir => {
        return dir === '..'
      })

      if (dotdotFound) {
        return [`Found illegal '..' in '${sourcePath}'`]
      }

      return []
    }

    /**
     * Helper function to check if string starts with '.' or '/'
     *
     * @param sourcePath
     */
    function checkBeginning(sourcePath) {
      const startsWithSlash = sourcePath.charAt(0) === '/'
      const startsWithDot = sourcePath.charAt(0) === '.'

      if (startsWithSlash) {
        return [`Found illegal beginning character '/' in '${sourcePath}'`]
      } else if (startsWithDot) {
        return [`Found illegal beginning character '.' in '${sourcePath}'`]
      }

      return []
    }

    if (typeof pathOrURL === 'string') {
      const pathsErrors = []
      const dotdotErrors = checkForDotDot(pathOrURL)
      const beginningErrors = checkBeginning(pathOrURL)

      return pathsErrors.concat(dotdotErrors).concat(beginningErrors)
    }

    return [`Resource path ${pathOrURL} is not a string.`]
  }
}
