import parse from 'csv-parse';
import 'isomorphic-fetch'

const isBrowser = typeof window !== 'undefined';

let fs
if (!isBrowser) {
  fs = require('fs');
}

class Utils {
  static isRemoteURL(path) {
    return path.match(/\w+:\/\/.+/);
  }

  static get isBrowser() {
    return isBrowser
  }

  static readFileOrURL(pathOrURL) {
    function _readURL(_url) {
      return fetch(_url)
        .then((response) => {
          if (!response.ok) {
            console.log(response.text())
            throw new Error('Bad response from server');
          }

          return response.text();
        });
    }

    function _readFile(path) {
      // WARN: This only works on NodeJS
      return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    let result;

    if (isBrowser || Utils.isRemoteURL(pathOrURL)) {
      result = _readURL(pathOrURL);
    } else {
      result = _readFile(pathOrURL);
    }

    return result;
  }

  static _csvParse(text) {
    return new Promise((resolve, reject) => {
      parse(text, { columns: true }, (err, output) => {
        if (err) {
          reject(err);
        } else {
          resolve(output);
        }
      });
    });
  }
}

export default Utils
