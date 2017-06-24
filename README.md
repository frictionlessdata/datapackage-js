# datapackage-js

[![Travis](https://travis-ci.org/frictionlessdata/datapackage-js.svg?branch=master)](https://travis-ci.org/frictionlessdata/datapackage-js)
[![Coveralls](https://coveralls.io/repos/github/frictionlessdata/datapackage-js/badge.svg?branch=master)](https://coveralls.io/github/frictionlessdata/datapackage-js?branch=master)
[![NPM](https://img.shields.io/npm/v/datapackage.svg)](https://www.npmjs.com/package/datapackage)
[![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/frictionlessdata/chat)

A library for working with [Data Packages](http://specs.frictionlessdata.io/data-package/).

> Version v1.0 includes various important changes. Please read a [migration guide](#v10).

## Features

 - `DataPackage` class for working with data packages
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


Code examples in this readme requires Node v8.0+ or proper modern browser . Also you have to wrap code into async function if there is await keyword used. You could see even more example in [examples](https://github.com/frictionlessdata/datapackage-js/tree/master/examples) directory.

```js
const {DataPackage} = require('datapackage')

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

DataPackage.load(data, schema).then(dataPackage, async () => {
    const resource = dataPackage.resources[0]
    await resource.table.read() // [[180, 18, 'Tony'], [192, 32, 'Jacob']]
})
```

## Documentation

### DataPackage

A class for working with datapackages. It provides means for modifying the datapackage descriptor and adding resources, handling validation on along the process.

```js
const dataPackage = await DataPackage.load(<descriptor>)

dataPackage.valid // true
dataPackage.errors // []
dataPackage.profile // profile instance (ses below)
dataPackage.descriptor // retrieved/dereferenced/expanded descriptor
dataPackage.resources // array of data resource instances (see below)
```

#### `async DataPackage.load(descriptor, {basePath, strict=true})`

Factory method to instantiate `DataPackage` class. This method is async and it should be used with await keyword or as a `Promise`.

- `descriptor (String/Object)` - data package descriptor as local path, url or object
- `basePath (String)` - base path for all relative pathes
- `strict (Boolean)` - strict flag to alter validation behaviour
  - by default strict is true so any validation error will be raised
  - it could be set to false to ignore and put validation errors to `dataPackage.errors`
- `(Error)` - raises error if resource can't be instantiated
- `(Error[])` - raises list of validation errors if strict is true
- `(DataPackage)` - returns data package class instance

List of actions on descriptor:
- retrieved (if path/url)
- dereferenced (schema/dialect)
- expanded (with profile defaults)
- validated (against descriptor.profile)

#### `dataPackage.valid`

- `(Boolean)` - returns validation status. It always true in strict mode.

#### `dataPackage.errors`

- `(Error[])` - returns validation errors. It always empty in strict mode.

#### `dataPackage.profile`

- `(Profile)` - returns an instance of `Profile` class (see below).

#### `dataPackage.descriptor`

- `(Object)` - returns data package descriptor

#### `dataPackage.resources`

- `(Resource[])` - returns an array of `Resource` instances (see below).

#### `dataPackage.resourceNames`

- `(String[])` - returns an array of resource names.

#### `dataPackage.addResource(descriptor)`

Add new resource to data package. The data package descriptor will be validated  with newly added resource descriptor.

- `descriptor (Object)` - data resource descriptor
- `(Error[])` - raises list of validation errors
- `(Error)` - raises any resource creation error
- `(Resource/null)` - returns added `Resource` instance or null if not added

#### `dataPackage.getResource(name)`

Get data package resource by name.

- `name (String)` - data resource name
- `(Resource/null)` - returns `Resource` instances or null if not found

#### `dataPackage.removeResource(name)`

Remove data package resource by name. The data package descriptor will be validated after resource descriptor removal.

- `name (String)` - data resource name
- `(Error[])` - raises list of validation errors
- `(Resource/null)` - returns removed `Resource` instances or null if not found

#### `async dataPackage.save(target)`

> For now only descriptor will be saved.

Save data package to target destination.

- `target (String)` - path where to save a data package
- `(Error)` - raises an error if there is saving problem
- `(Boolean)` - returns true on success

#### `dataPackage.update()`

Update data package instance if there are in-place changes in the descriptor.

- `(Error[])` - raises list of validation errors
- `(Error)` - raises any resource creation error
- `(Boolean)` - returns true on success and false if not modified

```js
const dataPackage = await DataPackage.load({
    name: 'package',
    resources: [{name: 'resource', data: ['data']}]
})

dataPackage.name // package
dataPackage.descriptor.name = 'renamed-package'
dataPackage.name // package
dataPackage.update()
dataPackage.name // renamed-package
```

### Resource

A class for working with data resources. You can read or iterate tabular resources using the `table` property.

> Synchronous resource.table property and table.headers are WIP

```js
const descriptor = {
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

const resource = await Resource.load(data, schema)

resource.name // example
resource.tabuler // true
resource.descriptor // descriptor
resource.sourceType // inline
resource.source // descriptor.data

resource.table.headers // ['height', 'age', 'name]
await resource.table.read() // [[180, 18, 'Tony'], [192, 32, 'Jacob']]
```

#### `async Resource.load(descriptor, {basePath})`

Factory method to instantiate `Resource` class. This method is async and it should be used with await keyword or as a `Promise`.

- `descriptor (String/Object)` - data resource descriptor as local path, url or object
- `basePath (String)` - base path for all relative pathes
- `(Error)` - raises error if resource can't be instantiated
- `(Resource)` - returns resource class instance

List of actions on descriptor:
- retrieved (if path/url)
- dereferenced (schema/dialect)
- expanded (with profile defaults)

#### `resource.name`

- `(String)` - returns resource name

#### `resource.tabular`

- `(Boolean)` - returns true if resource is tabular

#### `resource.descriptor`

- (Object) - returns resource descriptor

#### `resource.sourceType`

- `(String)` - returns based on resource data/path property
  - inline
  - local
  - remote
  - multipart-local
  - multipart-remote

#### `resource.source`

- `(any/String/String[])` - returns based on resource data/path property
  - `descriptor.data` - inline
  - `descriptor.path[0]` - local/remote
  - `descriptor.path` - multipart-loca/remote

Combination of `resource.source` and `resource.sourceType` provides predictable interface to work with resource data:

```js
if (resource.sourceType === 'local') {
  // logic to handle local file
} else if (resource.sourceType === 'remote') {
  // logic to handle remote file
} else if (resource.sourteType.startsWith('multipart')) {
  // logic to handle list of chunks
}
```

#### `resource.table`

- `(Error)` - raises on any table opening error
- `(null/tableschema.Table)` - returns table instance if resource is tabular

Read API documentation - [tableschema.Table](https://github.com/frictionlessdata/tableschema-js#table).

### Profile

A component to represent JSON Schema profile from [Schema Registry]( https://specs.frictionlessdata.io/schemas/registry.json).

```js
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

### validate

A standalone function to validate a data package descriptor.

```js
try {
  const valid = await validate({name: 'Invalid Datapackage'})
} catch (errors) {
  for (const error of errors) {
    error // descriptor error
  }
}
```

#### `async validate(descriptor)`

This funcion is async so it has to be used with `await` keyword or as a `Promise`.

- `descriptor (String/Object)` - data package descriptor (local/remote path or object)
- `(Error[])` - raises list of validation errors for invalid
- `(Boolean)` - returns true for valid

List of actions on descriptor:
- retrieved (if path/url)
- dereferenced (schema/dialect)
- expanded (with profile defaults)
- validated (against descriptor.profile)

## Changelog

Here described only breaking and the most important changes. The full changelog could be found in nicely formatted [commit history](https://github.com/frictionlessdata/datapackage-js/commits/master).

### v1.0

This version includes various big changes. A migration guide is under development and will be published here.

### [v0.8](https://github.com/frictionlessdata/datapackage-js/tree/v0.8.x)

First stable version of the library.

## Contributing

The project follows the [Open Knowledge International coding standards](https://github.com/okfn/coding-standards). There are common commands to work with the project:

```
$ npm install
$ npm run test
$ npm run build
```
