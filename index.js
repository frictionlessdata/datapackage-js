var fs = require('fs')
  , path = require('path')
  , parse = require('csv-parse')
  , transform = require('stream-transform')
  , Promise = require('bluebird')
  , dpRead = require('datapackage-read')
  ;

// ========================================================
// DataPackage and Resource objects


// TODO: (??) allow path to be a datapackage identifier and parse it correctly ... (e.g. strip datapackage.json)
// e.g. var dp = new DataPackage('finance-vix')
// dp.path = https://data.okfn.org/data/core/finance-vix

// Instantiate a datapackage
exports.DataPackage = function(datapackageJsonOrPath) {
  this.metadata = {};
  this.resources = [];
  this.path = null;
  if (datapackageJsonOrPath) {
    if (typeof(datapackageJsonOrPath) == 'string') {
      this.path = datapackageJsonOrPath;
    } else{
      this.setDataPackageJson(datapackageJsonOrPath);
    }
  }
}

// setter method to set datapackage json (and set up resource objects)
exports.DataPackage.prototype.setDataPackageJson = function(data) {
  var that = this;
  this.metadata = data;
  this.resources = [];
  this.metadata.resources.forEach(function(resource, idx) {
    var res = new exports.Resource(resource, that.path);
    that.resources.push(res);
  });
}

// load datapackage metadata
exports.DataPackage.prototype.load = function(callback) {
  var that = this;
  var p = new Promise(function(resolve, reject) {
    dpRead.load(that.path, function(error, dpkgObj) {
      if (error) {
        reject(error);
      } else {
        that.setDataPackageJson(dpkgObj);
        resolve();
      }
    });
  });
  return p;
}

// get the resource object specified by resourceIdentifier string which may be a name or an number (index)
exports.DataPackage.prototype.getResource = function(resourceIdentifier) {
  var resourceIndex = 0
    , resource = null
    ;

  if (resourceIdentifier.match('^\d+$')) {
    resourceIndex = parseInt(resourceIdentifier)
  } else {
    this.resources.forEach(function(res, idx) {
      if (res.metadata.name === resourceIdentifier) {
        resourceIndex = idx;
      }
    });
  }

  if (this.resources.length == 0) {
    return null;
  } else {
    resource = this.resources[resourceIndex];
    return resource;
  }
}


// Resource object
exports.Resource = function(resourceObject, base) {
  this.base = base || '';
  this.metadata = resourceObject;
}

// TODO: support urls vs just paths ...
exports.Resource.prototype.fullPath = function() {
  return path.join(this.base, this.metadata.path);
}

// give me a raw (binary) resource stream
// TODO: use the base path when locating the data ...
exports.Resource.prototype.rawStream = function() {
  if (this.metadata.url) {
    return request(this.metadata.url);
  } else if (this.metadata.path) {
    return fs.createReadStream(this.fullPath());
  } else if (resource.metadata) {
    // TODO: what happens if it is already JSON objects ...?
    return _streamFromString(this.metadata.data);
  } else {
    return null
  }
}

function _streamFromString(string) {
  var s = new stream.Readable();
  s._read = function noop() {}; // redundant? see update below
  s.push(string);
  s.push(null);
}

// given a resource, give me a stream containing json objects representing data in the stream

// if a callback is provided then rather than return the stream return an array containing the rows of the data (as parsed)

// for tabular data this is a stream of the row objects
// TODO: for geo probably something a bit different
exports.Resource.prototype.stream = function() {
  if (this.metadata.format && this.metadata.format != 'csv') {
    throw Exception('We can only handle CSV data at the moment');
  }

  var stream = this.rawStream();
  return exports.csvToStream(this.rawStream(), this.metadata.schema);
}

// get resource data as array of objects
exports.Resource.prototype.objects = function() {
  var stream = this.stream();
  return exports.objectStreamToArray(stream);
}

// given a raw file stream for a CSV return an object stream
// use JSON Table Schema to do type casting if provided
// use csv description format if provided
//
// TODO: error handling e.g. if a type casts badly ...
exports.csvToStream = function(csvStream, jsonTableSchema, csvDialect) {
  var parseOptions = {
    columns: true,
    ltrim: true
  }
  if (csvDialect){
    parseOptions.delimiter = csvDialect.delimiter || ','
    parseOptions.rowDelimiter = csvDialect.lineTerminator
    parseOptions.quote = csvDialect.quoteChar || '"'
    if (csvDialect.doubleQuote != undefined && csvDialect.doubleQuote == false){
	parseOptions.escape = ''
    }
  }
  var parser = parse(parseOptions);
  var castMap = {};
  function parseDate(str) {
    //return new Date(str);
    return Date.parse(str);
  };
  function parseBoolean(bool) {
    if (bool.toLowerCase() === 'true' | bool === '1') {
      return true
    } else if (bool.toLowerCase() === 'false' | bool === '0'){
      return false
    }
  };
  var typeToCast = {
    'integer': parseInt,
    'number': parseFloat,
    // TODO: security question - can we pass string to date that will blow it up in some way?
    'date': parseDate,
    'datetime': parseDate,
    'boolean': parseBoolean,
    'object': JSON.parse,
    'array': JSON.parse
  };
  if (jsonTableSchema && jsonTableSchema.fields) {
    jsonTableSchema.fields.forEach(function(field) {
      if (field.type in typeToCast) {
        castMap[field.name] = typeToCast[field.type];
      }
    });
  }
  var transformer = transform(function(data) {
    for (key in data) {
      if (key in castMap) {
        data[key] = castMap[key](data[key]);
      }
    }
    return data;
  });

  var outstream = csvStream.pipe(parser).pipe(transformer);
  return outstream;
}

// ========================================================
// Misc Functions

// TODO: should not really be an export but used in tests ...
exports.objectStreamToArray = function(stream) {
  var p = new Promise(function(resolve, reject) {
    var output = [];
    stream.on('readable', function() {
      while(row = stream.read()) {
        output.push(row);
      }
    });
    stream.on('error', function(error) {
      reject(error);
    });
    stream.on('finish', function() {
      resolve(output);
    });
  });
  return p;
}

