# datapackage-js

[![Travis](https://travis-ci.org/frictionlessdata/datapackage-js.svg?branch=master)](https://travis-ci.org/frictionlessdata/datapackage-js)
[![Coveralls](https://coveralls.io/repos/github/frictionlessdata/datapackage-js/badge.svg?branch=master)](https://coveralls.io/github/frictionlessdata/datapackage-js?branch=master)
[![NPM](https://img.shields.io/npm/v/datapackage.svg)](https://www.npmjs.com/package/datapackage)
[![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/frictionlessdata/chat)

A library for working with [Data Packages](http://specs.frictionlessdata.io/data-package/).

> Version v1.0 includes various important changes. Please read a [migration guide](#v10).

## Features

 - `Package` class for working with data packages
 - `Resource` class for working with data resources
 - `Profile` class for working with profiles
 - `validate` function for validating data package descriptors

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

const datapackage = await Package.load(descriptor)
const resource = datapackage.getResource('example')
await resource.table.read() // [[180, 18, 'Tony'], [192, 32, 'Jacob']]
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

First we create a blank data package. We need to provide a base path because we're going to work with local files:

```javascript
const datapackage = await Package.load({}, {basePath: '.'})
```

Now we're ready to infer a data package descriptor based on data files we have. Because we have two csv files we use glob pattern `**/*.csv`:

```javascript
await datapackage.infer('**/*.csv')
datapackage.descriptor
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

An `infer` method has found all our files and inspected it to extract useful metadata like profile, encoding, format, Table Schema etc. Let's tweak it a little bit:

```javascript
datapackage.descriptor.resources[1].schema.fields[1].type = 'year'
datapackage.commit()
datapackage.valid // true
```

Because our resources are tabular we could read it as a tabular data:

```javascript
await datapackage.getResource('population').table.read({keyed: true})

//[ { city: 'london', year: 2017, population: 8780000 },
//  { city: 'paris', year: 2017, population: 2240000 },
//  { city: 'rome', year: 2017, population: 2860000 } ]
```

Let's save our descriptor on the disk. After it we could update our `datapackage.json` as we want, make some changes etc:

```javascript
await datapackage.save('datapackage.json')
```

To continue the work with the data package we just load it again but this time using local `datapackage.json`:

```javascript
const datapackage = await Package.load('datapackage.json')
// Continue the work
```

It was onle basic introduction to the `Package` class. To learn more let's take a look on `Package` class API reference.

#### `async Package.load(descriptor, {basePath, strict=false})`

Factory method to instantiate `Package` class. This method is async and it should be used with await keyword or as a `Promise`.

- `descriptor (String/Object)` - data package descriptor as local path, url or object
- `basePath (String)` - base path for all relative paths
- `strict (Boolean)` - strict flag to alter validation behavior. Setting it to `true` leads to throwing errors on any operation with invalid descriptor
- `(Error)` - raises error if resource can't be instantiated
- `(Error[])` - raises list of validation errors if strict is true
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
- `(Error[])` - raises list of validation errors
- `(Error)` - raises any resource creation error
- `(Resource/null)` - returns added `Resource` instance or null if not added

#### `package.removeResource(name)`

Remove data package resource by name. The data package descriptor will be validated after resource descriptor removal.

- `name (String)` - data resource name
- `(Error[])` - raises list of validation errors
- `(Resource/null)` - returns removed `Resource` instances or null if not found

#### `async package.infer(pattern=false)`

Infer a data package metadata. If `pattern` is not provided only existent resources will be inferred (added metadata like encoding, profile etc). If `pattern` is provided new resoures with file names mathing the pattern will be added and inferred. It commits changes to data package instance.

- `pattern (String)` - glob pattern for new resources
- `(Object)` - returns data package descriptor

#### `package.commit({strict})`

Update data package instance if there are in-place changes in the descriptor.

- `strict (Boolean)` - alter `strict` mode for further work
- `(Error[])` - raises list of validation errors
- `(Error)` - raises any resource creation error
- `(Boolean)` - returns true on success and false if not modified

```javascript
const datapackage = await Package.load({
    name: 'package',
    resources: [{name: 'resource', data: ['data']}]
})

datapackage.name // package
datapackage.descriptor.name = 'renamed-package'
datapackage.name // package
datapackage.commit()
datapackage.name // renamed-package
```

#### `async package.save(target)`

> For now only descriptor will be saved.

Save data package to target destination.

- `target (String)` - path where to save a data package
- `(Error)` - raises an error if there is saving problem
- `(Boolean)` - returns true on success

### Resource

A class for working with data resources. You can read or iterate tabular resources using the `table` property.

Consider we have some local csv file. It could be inline data or remote link - all supported by `Resource` class (except local files for in-brower usage of course). But say it's `data.csv` for now:

```csv
city,location
london,"51.50,-0.11"
paris,"48.85,2.30"
rome,N/A
```

Let's create and read a resource. We use static `Resource.load` method instantiate a resource. Because resource is tabular we could use `resource.table.read` method with a `keyed` option to get an array of keyed rows:

```javascript
const resource = await Resource.load({path: 'data.csv'})
resource.tabular // true
resource.table.headers // ['city', 'location']
await resource.table.read({keyed: true})
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
await resource.table.read({keyed: true})
// Fails with a data validation error
```

Let's fix not available location. There is a `missingValues` property in Table Schema specification. As a first try we set `missingValues` to `N/A` in `resource.descriptor.schema`. Resource descriptor could be changed in-place but all changes sould be commited by `resource.commit()`:

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

As a good citiziens we've decided to check out recource descriptor validity. And it's not valid! We sould use an array for `missingValues` property. Also don't forget to have an empty string as a missing value:

```javascript
resource.descriptor.schema['missingValues'] = ['', 'N/A']
resource.commit()
resource.valid // true
```

All good. It looks like we're ready to read our data again:

```javascript
await resource.table.read({keyed: true})
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
const stream = await resource.iter({stream: true})
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
- `(Error)` - raises error if resource can't be instantiated
- `(Resource)` - returns resource class instance

#### `package.valid`

- `(Boolean)` - returns validation status. It always true in strict mode.

#### `package.errors`

- `(Error[])` - returns validation errors. It always empty in strict mode.

#### `package.profile`

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

#### `resource.table`

For tabular resources it returns `Table` instance to interact with data table. Read API documentation - [tableschema.Table](https://github.com/frictionlessdata/tableschema-js#table).

- `(Error)` - raises on any table opening error
- `(null/tableschema.Table)` - returns table instance if resource is tabular

#### `await resource.iter({stream=false})`

Iterate over data chunks as bytes. If `stream` is true Node Stream will be returned.

- `stream (Boolean)` - Node Stream will be returned
- `(Iterator/Stream)` - returns Iterator/Stream

#### `await resource.read()`

Returns resource data as bytes.

- (Buffer) - returns Buffer with resource data

#### `async resource.infer()`

Infer resource metadata like name, format, mediatype, encoding, schema and profile. It commits this changes into resource instance.

- `(Object)` - returns resource descriptor

#### `resource.commit({strict})`

Update resource instance if there are in-place changes in the descriptor.

- `strict (Boolean)` - alter `strict` mode for further work
- `(Error[])` - raises list of validation errors
- `(Error)` - raises any resource creation error
- `(Boolean)` - returns true on success and false if not modified

#### `async resource.save(target)`

> For now only descriptor will be saved.

Save resource to target destination.

- `target (String)` - path where to save a resource
- `(Error)` - raises an error if there is saving problem
- `(Boolean)` - returns true on success

### Profile

A component to represent JSON Schema profile from [Profiles Registry]( https://specs.frictionlessdata.io/schemas/registry.json):

```javascript
await profile = Profile.load('data-package')

profile.name // data-package
profile.jsonschema // JSON Schema contents

try {
  const valid = profile.validate(descriptor)
} catch (errors) {
  for (const error of errors) {
    error // descriptor error
  }
}
```

#### `async Profile.load(profile)`

Factory method to instantiate `Profile` class. This method is async and it should be used with await keyword or as a `Promise`.

- `profile (String)` - profile name in registry or URL to JSON Schema
- `(Error)` - raises error if profile not found in registry
- `(Error)` - raises error if JSON Schema can't be loaded
- `(Profile)` - returns profile class instance

#### `profile.name`

- `(String/null)` - returns profile name if available

#### `profile.jsonschema`

- `(Object)` - returns profile JSON Schema contents

#### `profile.validate(descriptor)`

Validate a data package `descriptor` against the profile.

- `descriptor (Object)` - retrieved and dereferenced data package descriptor
- `(Error[])` - raises with list of errors for invalid
- `(Boolean)` - returns true for valid

### Validate

A standalone function to validate a data package descriptor.

```javascript
try {
  const valid = await validate({name: 'Invalid Datapackage'})
} catch (errors) {
  for (const error of errors) {
    error // descriptor error
  }
}
```

#### `async validate(descriptor)`

This function is async so it has to be used with `await` keyword or as a `Promise`.

- `descriptor (String/Object)` - data package descriptor (local/remote path or object)
- `(Error[])` - raises list of validation errors for invalid
- `(Boolean)` - returns true for valid

### Infer

A standalone function to infer a data package descriptor.

```javascript
const descriptor = await infer('**/*.csv', {basePath: '.'})
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

## Changelog

Here described only breaking and the most important changes. The full changelog and documentation for all released versions could be found in nicely formatted [commit history](https://github.com/frictionlessdata/datapackage-js/commits/master).

### v1.0

This version includes various big changes. A migration guide is under development and will be published here.

### v0.8

First stable version of the library.

## Contributing

The project follows the [Open Knowledge International coding standards](https://github.com/okfn/coding-standards). There are common commands to work with the project:

```
$ npm install
$ npm run test
$ npm run build
```
