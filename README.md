# DataPackage.js

[![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/frictionlessdata/chat)

A model for working with Data Packages in Node and the browser.

## Install

**npm coming soon**.

For now clone from github!

<!--
[![NPM](https://nodei.co/npm/datapackage.png)](https://nodei.co/npm/datapackage-render/)

```
npm install datapackage-render
```
-->

# Usage

```
var datapacakge = require('datapackage');

// or instantiate with a path and load
var dp = new datapackage.DataPackage('/path/on/disk/to/package/')
dp.load()
  .then(function() {
    // 'abc'
    console.log(dp.data.name);
  });


// you can also load direct from JSON object
var dpJson = {
  'name': 'abc'
};
var dp = new datapackage.DataPackage(dpJson);
```

### Resources

```
var dp = a data package with some resources

// Access the Data Pacakge data resources
var resource = dp.resources[0]

// will return the full path (url or on disk for the resource)
resource.fullPath()

// get the raw data file stream
resource.rawStream()

// get the data stream as set of JS objects (one for each row)
// this only works for tabular data at present
// data is automatically typecast
resource.stream()
```

### csvToSTream

Convenience function to load and convert a CSV to a stream using a [JSON Table Schema][jts] and [CSV Dialect description][dialect].

[jts]: http://frictionlessdata.io/guides/json-table-schema/
[dialect]: http://dataprotocols.org/csv-dialect/

```
// returns a Node **object** stream
// the csv dialect is optional
var stream = datapackage.csvToStream(rawDataStream, jsonTableSchema, csvDialect)

stream.on('readable', function() {
  while(row = stream.read()) {
    // something like {'col-1': 'abc', 'col-2': 2, ...}
    console.log(row);
  }
});
```

