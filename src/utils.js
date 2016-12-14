import parse from 'csv-parse'
import 'isomorphic-fetch'
import _ from 'lodash'
import path from 'path'

const isBrowser = typeof window !== 'undefined'

let fs
if (!isBrowser) {
  fs = require('fs')
}

class Utils {
  static isRemoteURL(path) {
    return path.match(/\w+:\/\/.+/)
  }

  static get isBrowser() {
    return isBrowser
  }

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

    function _readFile(path) {
      // WARN: This only works on NodeJS
      return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
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

  static _csvParse(text) {
    return new Promise((resolve, reject) => {
      parse(text, { columns: true }, (err, output) => {
        if (err) {
          reject(err)
        } else {
          resolve(output)
        }
      })
    })
  }

  /**
   * Loads the base path (dirname) of the path.
   *
   * @param pathOrURL
   * @return {String|null}
   * @private
   */
  static getDirname(pathOrURL) {
    if (!Utils.isBrowser && !Utils.isRemoteURL(pathOrURL)) {
      return path.dirname(path.resolve(pathOrURL))
    }
    return null
  }
}

export default Utils

/* eslint global-require: "off" */
