import isRemoteURL from './is-remote-url';
import isBrowser from './is-browser';
import 'isomorphic-fetch';

let fs;
if (!isBrowser) {
  fs = require('fs');
}

function _readURL(_url) {
  return fetch(_url)
           .then((response) => {
             if (!response.ok) {
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

function readFileOrURL(pathOrURL) {
  let result;

  if (isBrowser || isRemoteURL(pathOrURL)) {
    result = _readURL(pathOrURL);
  } else {
    result = _readFile(pathOrURL);
  }

  return result;
}

export default readFileOrURL;
