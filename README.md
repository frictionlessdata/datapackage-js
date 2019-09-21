# datapackage-js

[![Travis](https://travis-ci.org/frictionlessdata/datapackage-js.svg?branch=master)](https://travis-ci.org/frictionlessdata/datapackage-js)
[![Coveralls](https://coveralls.io/repos/github/frictionlessdata/datapackage-js/badge.svg?branch=master)](https://coveralls.io/github/frictionlessdata/datapackage-js?branch=master)
[![NPM](https://img.shields.io/npm/v/datapackage.svg)](https://www.npmjs.com/package/datapackage)
[![Github](https://img.shields.io/badge/github-master-brightgreen)](https://github.com/frictionlessdata/datapackage-js)
[![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/frictionlessdata/chat)

A library for working with [Data Packages](http://specs.frictionlessdata.io/data-package/).

## Features

 - `Package` class for working with data packages
 - `Resource` class for working with data resources
 - `Profile` class for working with profiles
 - `validate` function for validating data package descriptors
 - `infer` function for inferring data package descriptors

## Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Examples](#examples)
- [Documentation](#documentation)
  - [Package](#package)
  - [Resource](#resource)
  - [Profile](#profile)
  - [validate](#validate)
  - [infer](#infer)
  - [Foreign Keys](#foreign-keys)
  - [Errors](#errors)
- [Contributing](#contributing)
- [Changelog](#changelog)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Getting Started

### Installation

The package use semantic versioning. It means that major versions  could include breaking changes. It's highly recommended to specify `datapackage` version range in your `package.json` file e.g. `datapackage: ^1.0` which  will be added by default by `npm install --save`.

#### NPM

```bash
$ npm install datapackage@latest # v1.0
$ npm install datapackage # v0.8
```

#### CDN

```html
<script src="//unpkg.com/datapackage/dist/datapackage.min.js"></script>
```

### Examples


Code examples in this readme requires Node v8.3+ or proper modern browser . Also you have to wrap code into async function if there is await keyword used. You could see even more example in [examples](https://github.com/frictionlessdata/datapackage-js/tree/master/examples) directory.

```javascript
const {Package} = require('datapackage')

const descriptor = {
  resources: [
    {
      name: 'example',
      profile: 'tabular-data-resource',
      data: [
        ['height', 'age', 'name'],
        ['180', '18', 'Tony'],
        ['192', '32', 'Jacob'],
      ],
      schema:  {
        fields: [
          {name: 'height', type: 'integer'},
          {name: 'age', type: 'integer'},
          {name: 'name', type: 'string'},
        ],
      }
    }
  ]
}

const dataPackage = await Package.load(descriptor)
const resource = dataPackage.getResource('example')
await resource.read() // [[180, 18, 'Tony'], [192, 32, 'Jacob']]
```

## Documentation

### Package

A class for working with data packages. It provides various capabilities like loading local or remote data package, inferring a data package descriptor, saving a data package descriptor and many more.

Consider we have some local csv files in a `data` directory. Let's create a data package based on this data using a `Package` class:

> data/cities.csv

```csv
city,location
london,"51.50,-0.11"
paris,"48.85,2.30"
rome,"41.89,12.51"
```

> data/population.csv

```csv
city,year,population
london,2017,8780000
paris,2017,2240000
rome,2017,2860000
```

First we create a blank data package::

```javascript
const dataPackage = await Package.load()
```

Now we're ready to infer a data package descriptor based on data files we have. Because we have two csv files we use glob pattern `**/*.csv`:

```javascript
await dataPackage.infer('**/*.csv')
dataPackage.descriptor
//{ profile: 'tabular-data-package',
//  resources:
//   [ { path: 'data/cities.csv',
//       profile: 'tabular-data-resource',
//       encoding: 'utf-8',
//       name: 'cities',
//       format: 'csv',
//       mediatype: 'text/csv',
//       schema: [Object] },
//     { path: 'data/population.csv',
//       profile: 'tabular-data-resource',
//       encoding: 'utf-8',
//       name: 'population',
//       format: 'csv',
//       mediatype: 'text/csv',
//       schema: [Object] } ] }
```

An `infer` method has found all our files and inspected it to extract useful metadata like profile, encoding, format, Table Schema etc. Let's tweak it a little bit:

```javascript
dataPackage.descriptor.resources[1].schema.fields[1].type = 'year'
dataPackage.commit()
dataPackage.valid // true
```

Because our resources are tabular we could read it as a tabular data:

```javascript
await dataPackage.getResource('population').read({keyed: true})

//[ { city: 'london', year: 2017, population: 8780000 },
//  { city: 'paris', year: 2017, population: 2240000 },
//  { city: 'rome', year: 2017, population: 2860000 } ]
```

Let's save our descriptor on the disk. After it we could update our `datapackage.json` as we want, make some changes etc:

```javascript
await dataPackage.save('datapackage.json')
```

To continue the work with the data package we just load it again but this time using local `datapackage.json`:

```javascript
const dataPackage = await Package.load('datapackage.json')
// Continue the work
```

It was onle basic introduction to the `Package` class. To learn more let's take a look on `Package` class API reference.

#### `async Package.load(descriptor, {basePath, strict=false})`

Factory method to instantiate `Package` class. This method is async and it should be used with await keyword or as a `Promise`.

- `descriptor (String/Object)` - data package descriptor as local path, url or object. If ththe path has a `zip` file extension it will be unzipped to the temp directory first.
- `basePath (String)` - base path for all relative paths
- `strict (Boolean)` - strict flag to alter validation behavior. Setting it to `true` leads to throwing errors on any operation with invalid descriptor
- `(errors.DataPackageError)` - raises error if something goes wrong
- `(Package)` - returns data package class instance

#### `package.valid`

- `(Boolean)` - returns validation status. It always true in strict mode.

#### `package.errors`

- `(Error[])` - returns validation errors. It always empty in strict mode.

#### `package.profile`

- `(Profile)` - returns an instance of `Profile` class (see below).

#### `package.descriptor`

- `(Object)` - returns data package descriptor

#### `package.resources`

- `(Resource[])` - returns an array of `Resource` instances (see below).

#### `package.resourceNames`

- `(String[])` - returns an array of resource names.

#### `package.getResource(name)`

Get data package resource by name.

- `name (String)` - data resource name
- `(Resource/null)` - returns `Resource` instances or null if not found

#### `package.addResource(descriptor)`

Add new resource to data package. The data package descriptor will be validated  with newly added resource descriptor.

- `descriptor (Object)` - data resource descriptor
- `(errors.DataPackageError)` - raises error if something goes wrong
- `(Resource/null)` - returns added `Resource` instance or null if not added

#### `package.removeResource(name)`

Remove data package resource by name. The data package descriptor will be validated after resource descriptor removal.

- `name (String)` - data resource name
- `(errors.DataPackageError)` - raises error if something goes wrong
- `(Resource/null)` - returns removed `Resource` instances or null if not found

#### `async package.infer(pattern=false)`

Infer a data package metadata. If `pattern` is not provided only existent resources will be inferred (added metadata like encoding, profile etc). If `pattern` is provided new resoures with file names mathing the pattern will be added and inferred. It commits changes to data package instance.

- `pattern (String)` - glob pattern for new resources
- `(Object)` - returns data package descriptor

#### `package.commit({strict})`

Update data package instance if there are in-place changes in the descriptor.

- `strict (Boolean)` - alter `strict` mode for further work
- `(errors.DataPackageError)` - raises error if something goes wrong
- `(Boolean)` - returns true on success and false if not modified

```javascript
const dataPackage = await Package.load({
    name: 'package',
    resources: [{name: 'resource', data: ['data']}]
})

dataPackage.name // package
dataPackage.descriptor.name = 'renamed-package'
dataPackage.name // package
dataPackage.commit()
dataPackage.name // renamed-package
```

#### `async package.save(target)`

Save data package to target destination. If target path has a  zip file extension the package will be zipped and saved entirely. If it has a json file extension only the descriptor will be saved.

- `target (String)` - path where to save a data package
- `(errors.DataPackageError)` - raises error if something goes wrong
- `(Boolean)` - returns true on success

### Resource

A class for working with data resources. You can read or iterate tabular resources using the `iter/read` methods and all resource as bytes using `rowIter/rowRead` methods.

Consider we have some local csv file. It could be inline data or remote link - all supported by `Resource` class (except local files for in-brower usage of course). But say it's `data.csv` for now:

```csv
city,location
london,"51.50,-0.11"
paris,"48.85,2.30"
rome,N/A
```

Let's create and read a resource. We use static `Resource.load` method instantiate a resource. Because resource is tabular we could use `resource.read` method with a `keyed` option to get an array of keyed rows:

```javascript
const resource = await Resource.load({path: 'data.csv'})
resource.tabular // true
resource.headers // ['city', 'location']
await resource.read({keyed: true})
// [
//   {city: 'london', location: '51.50,-0.11'},
//   {city: 'paris', location: '48.85,2.30'},
//   {city: 'rome', location: 'N/A'},
// ]
```

As we could see our locations are just a strings. But it should be geopoints. Also Rome's location is not available but it's also just a `N/A` string instead of JavaScript `null`. First we have to infer resource metadata:

```javascript
await resource.infer()
resource.descriptor
//{ path: 'data.csv',
//  profile: 'tabular-data-resource',
//  encoding: 'utf-8',
//  name: 'data',
//  format: 'csv',
//  mediatype: 'text/csv',
// schema: { fields: [ [Object], [Object] ], missingValues: [ '' ] } }
await resource.read({keyed: true})
// Fails with a data validation error
```

Let's fix not available location. There is a `missingValues` property in Table Schema specification. As a first try we set `missingValues` to `N/A` in `resource.descriptor.schema`. Resource descriptor could be changed in-place but all changes should be commited by `resource.commit()`:

```javascript
resource.descriptor.schema.missingValues = 'N/A'
resource.commit()
resource.valid // false
resource.errors
// Error: Descriptor validation error:
//   Invalid type: string (expected array)
//    at "/missingValues" in descriptor and
//    at "/properties/missingValues/type" in profile
```

As a good citiziens we've decided to check out recource descriptor validity. And it's not valid! We should use an array for `missingValues` property. Also don't forget to have an empty string as a missing value:

```javascript
resource.descriptor.schema['missingValues'] = ['', 'N/A']
resource.commit()
resource.valid // true
```

All good. It looks like we're ready to read our data again:

```javascript
await resource.read({keyed: true})
// [
//   {city: 'london', location: [51.50,-0.11]},
//   {city: 'paris', location: [48.85,2.30]},
//   {city: 'rome', location: null},
// ]
```

Now we see that:
- locations are arrays with numeric lattide and longitude
- Rome's location is a native JavaScript `null`

And because there are no errors on data reading we could be sure that our data is valid againt our schema. Let's save our resource descriptor:

```javascript
await resource.save('dataresource.json')
```

Let's check newly-crated `dataresource.json`. It contains path to our data file, inferred metadata and our `missingValues` tweak:

```json
{
    "path": "data.csv",
    "profile": "tabular-data-resource",
    "encoding": "utf-8",
    "name": "data",
    "format": "csv",
    "mediatype": "text/csv",
    "schema": {
        "fields": [
            {
                "name": "city",
                "type": "string",
                "format": "default"
            },
            {
                "name": "location",
                "type": "geopoint",
                "format": "default"
            }
        ],
        "missingValues": [
            "",
            "N/A"
        ]
    }
}
```

If we decide to improve it even more we could update the `dataresource.json` file and then open it again. But this time let's read our resoure as a byte stream:

```javascript
const resource = await Resource.load('dataresource.json')
const stream = await resource.rawIter({stream: true})
stream.on('data', (data) => {
  // handle data chunk as a Buffer
})
```

It was onle basic introduction to the `Resource` class. To learn more let's take a look on `Resource` class API reference.

#### `async Resource.load(descriptor, {basePath, strict=false})`

Factory method to instantiate `Resource` class. This method is async and it should be used with await keyword or as a `Promise`.

- `descriptor (String/Object)` - data resource descriptor as local path, url or object
- `basePath (String)` - base path for all relative paths
- `strict (Boolean)` - strict flag to alter validation behavior. Setting it to `true` leads to throwing errors on any operation with invalid descriptor
- `(errors.DataPackageError)` - raises error if something goes wrong
- `(Resource)` - returns resource class instance

#### `resource.valid`

- `(Boolean)` - returns validation status. It always true in strict mode.

#### `resource.errors`

- `(Error[])` - returns validation errors. It always empty in strict mode.

#### `resource.profile`

- `(Profile)` - returns an instance of `Profile` class (see below).

#### `resource.descriptor`

- (Object) - returns resource descriptor

#### `resource.name`

- `(String)` - returns resource name

#### `resource.inline`

- `(Boolean)` - returns true if resource is inline

#### `resource.local`

- `(Boolean)` - returns true if resource is local

#### `resource.remote`

- `(Boolean)` - returns true if resource is remote

#### `resource.multipart`

- `(Boolean)` - returns true if resource is multipart

#### `resource.tabular`

- `(Boolean)` - returns true if resource is tabular

#### `resource.source`

- `(Array/String)` - returns `data` or `path` property

Combination of `resource.source` and `resource.inline/local/remote/multipart` provides predictable interface to work with resource data.

#### `resource.headers`

> Only for tabular resources

- `(String[])` - returns data source headers

#### `resource.schema`

> Only for tabular resources

It returns `Schema` instance to interact with data schema. Read API documentation - [tableschema.Schema](https://github.com/frictionlessdata/tableschema-js#schema).

- `(tableschema.Schema)` - returns schema class instance

#### `async resource.iter({keyed, extended, cast=true, relations=false, stream=false})`

> Only for tabular resources

Iter through the table data and emits rows cast based on table schema (async for loop). With a `stream` flag instead of async iterator a Node stream will be returned. Data casting could be disabled.

- `keyed (Boolean)` - iter keyed rows
- `extended (Boolean)` - iter extended rows
- `cast (Boolean)` - disable data casting if false
- `relations (Boolean)` - if true foreign key fields will be checked and resolved to its references
- `stream (Boolean)` - return Node Readable Stream of table rows
- `(errors.DataPackageError)` - raises any error occured in this process
- `(AsyncIterator/Stream)` - async iterator/stream of rows:
  - `[value1, value2]` - base
  - `{header1: value1, header2: value2}` - keyed
  - `[rowNumber, [header1, header2], [value1, value2]]` - extended

#### `async resource.read({keyed, extended, cast=true, relations=false, limit})`

> Only for tabular resources

Read the whole table and returns as array of rows. Count of rows could be limited.

- `keyed (Boolean)` - flag to emit keyed rows
- `extended (Boolean)` - flag to emit extended rows
- `cast (Boolean)` - flag to disable data casting if false
- `relations (Boolean)` - if true foreign key fields will be checked and resolved to its references
- `limit (Number)` - integer limit of rows to return
- `(errors.DataPackageError)` - raises any error occured in this process
- `(Array[])` - returns array of rows (see `table.iter`)

#### `resource.checkRelations()`

> Only for tabular resources

It checks foreign keys and raises an exception if there are integrity issues.

- `(errors.DataPackageError)` - raises if there are integrity issues
- `(Boolean)` - returns True if no issues

#### `await resource.rawIter({stream=false})`

Iterate over data chunks as bytes. If `stream` is true Node Stream will be returned.

- `stream (Boolean)` - Node Stream will be returned
- `(Iterator/Stream)` - returns Iterator/Stream

#### `await resource.rawRead()`

Returns resource data as bytes.

- (Buffer) - returns Buffer with resource data

#### `async resource.infer()`

Infer resource metadata like name, format, mediatype, encoding, schema and profile. It commits this changes into resource instance.

- `(Object)` - returns resource descriptor

#### `resource.commit({strict})`

Update resource instance if there are in-place changes in the descriptor.

- `strict (Boolean)` - alter `strict` mode for further work
- `(errors.DataPackageError)` - raises error if something goes wrong
- `(Boolean)` - returns true on success and false if not modified

#### `async resource.save(target)`

> For now only descriptor will be saved.

Save resource to target destination.

- `target (String)` - path where to save a resource
- `(errors.DataPackageError)` - raises error if something goes wrong
- `(Boolean)` - returns true on success

### Profile

A component to represent JSON Schema profile from [Profiles Registry]( https://specs.frictionlessdata.io/schemas/registry.json):

```javascript
await profile = Profile.load('data-package')

profile.name // data-package
profile.jsonschema // JSON Schema contents

const {valid, errors} = profile.validate(descriptor)
for (const error of errors) {
  // inspect Error objects
}
```

#### `async Profile.load(profile)`

Factory method to instantiate `Profile` class. This method is async and it should be used with await keyword or as a `Promise`.

- `profile (String)` - profile name in registry or URL to JSON Schema
- `(errors.DataPackageError)` - raises error if something goes wrong
- `(Profile)` - returns profile class instance

#### `profile.name`

- `(String/null)` - returns profile name if available

#### `profile.jsonschema`

- `(Object)` - returns profile JSON Schema contents

#### `profile.validate(descriptor)`

Validate a data package `descriptor` against the profile.

- `descriptor (Object)` - retrieved and dereferenced data package descriptor
- `(Object)` - returns a `{valid, errors}` object

### validate

A standalone function to validate a data package descriptor:

```javascript
const {valid, errors} = await validate({name: 'Invalid Datapackage'})
for (const error of errors) {
  // inspect Error objects
}
```

#### `async validate(descriptor)`

This function is async so it has to be used with `await` keyword or as a `Promise`.

- `descriptor (String/Object)` - data package descriptor (local/remote path or object)
- `(Object)` - returns a `{valid, errors}` object

### infer

A standalone function to infer a data package descriptor.

```javascript
const descriptor = await infer('**/*.csv')
//{ profile: 'tabular-data-resource',
//  resources:
//   [ { path: 'data/cities.csv',
//       profile: 'tabular-data-resource',
//       encoding: 'utf-8',
//       name: 'cities',
//       format: 'csv',
//       mediatype: 'text/csv',
//       schema: [Object] },
//     { path: 'data/population.csv',
//       profile: 'tabular-data-resource',
//       encoding: 'utf-8',
//       name: 'population',
//       format: 'csv',
//       mediatype: 'text/csv',
//       schema: [Object] } ] }
```

#### `async infer(pattern, {basePath})`

This function is async so it has to be used with `await` keyword or as a `Promise`.

- `pattern (String)` - glob file pattern
- `(Object)` - returns data package descriptor

### Foreign Keys

The library supports foreign keys described in the [Table Schema](http://specs.frictionlessdata.io/table-schema/#foreign-keys) specification. It means if your data package descriptor use `resources[].schema.foreignKeys` property for some resources a data integrity will be checked on reading operations.

Consider we have a data package:

```javascript
const DESCRIPTOR = {
  'resources': [
    {
      'name': 'teams',
      'data': [
        ['id', 'name', 'city'],
        ['1', 'Arsenal', 'London'],
        ['2', 'Real', 'Madrid'],
        ['3', 'Bayern', 'Munich'],
      ],
      'schema': {
        'fields': [
          {'name': 'id', 'type': 'integer'},
          {'name': 'name', 'type': 'string'},
          {'name': 'city', 'type': 'string'},
        ],
        'foreignKeys': [
          {
            'fields': 'city',
            'reference': {'resource': 'cities', 'fields': 'name'},
          },
        ],
      },
    }, {
      'name': 'cities',
      'data': [
        ['name', 'country'],
        ['London', 'England'],
        ['Madrid', 'Spain'],
      ],
    },
  ],
}
```

Let's check relations for a `teams` resource:

```javascript
const {Package} = require('datapackage')

const package = await Package.load(DESCRIPTOR)
teams = package.getResource('teams')
await teams.checkRelations()
// tableschema.exceptions.RelationError: Foreign key "['city']" violation in row "4"
```

As we could see there is a foreign key violation. That's because our lookup table `cities` doesn't have a city of `Munich` but we have a team from there. We need to fix it in `cities` resource:

```javascript
package.descriptor['resources'][1]['data'].push(['Munich', 'Germany'])
package.commit()
teams = package.getResource('teams')
await teams.checkRelations()
// True
```

Fixed! But not only a check operation is available. We could use `relations` argument for `resource.iter/read` methods to dereference a resource relations:

```javascript
await teams.read({keyed: true, relations: true})
//[{'id': 1, 'name': 'Arsenal', 'city': {'name': 'London', 'country': 'England}},
// {'id': 2, 'name': 'Real', 'city': {'name': 'Madrid', 'country': 'Spain}},
// {'id': 3, 'name': 'Bayern', 'city': {'name': 'Munich', 'country': 'Germany}}]
```

Instead of plain city name we've got a dictionary containing a city data. These `resource.iter/read` methods will fail with the same as `resource.check_relations` error if there is an integrity issue. But only if `relations: true` flag is passed.

### Errors

#### `errors.DataPackageError`

Base class for the all library errors. If there are more than one error you could get an additional information from the error object:

```javascript
try {
  // some lib action
} catch (error) {
  console.log(error) // you have N cast errors (see error.errors)
  if (error.multiple) {
    for (const error of error.errors) {
        console.log(error) // cast error M is ...
    }
  }
}
```

## Contributing

The project follows the [Open Knowledge International coding standards](https://github.com/okfn/coding-standards). There are common commands to work with the project:

```
$ npm install
$ npm run test
$ npm run build
```

## Changelog

Here described only breaking and the most important changes. The full changelog and documentation for all released versions could be found in nicely formatted [commit history](https://github.com/frictionlessdata/datapackage-js/commits/master).

#### v1.1

Updated behaviour:

- Resource's `escapeChar` and `quoteChar` are mutually exclusive now

New API added:

- Added support of `zip` files for data packages
- Added support of `format/encoding/dialect` for resources

#### v1.0

This version includes various big changes. A migration guide is under development and will be published here.

#### v0.8

First stable version of the library.
