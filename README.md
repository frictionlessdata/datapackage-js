# datapackage-js

[![Travis Build Status](https://travis-ci.org/frictionlessdata/datapackage-js.svg?branch=master)](https://travis-ci.org/frictionlessdata/datapackage-js)
[![Coverage Status](https://coveralls.io/repos/github/frictionlessdata/datapackage-js/badge.svg?branch=master)](https://coveralls.io/github/frictionlessdata/datapackage-js?branch=master)
[![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/frictionlessdata/chat)

A model for working with [Data Packages](http://specs.frictionlessdata.io/data-package/).

> Version v1.0.0-alpha [WIP] has BREAKING CHANGES. A migration guide will be published.

> - Starting from version v0.8.0 `datapackage` on NPM contains this library. Data Package Manager could be found [here](https://github.com/frictionlessdata/dpm-js).
- Version v0.2.0 has renewed API introduced in NOT backward-compatibility manner. Previous version could be found [here](https://github.com/frictionlessdata/datapackage-js/tree/2bcf8e516fb1d871bd6b155962871f5cfd563c52).


## Features

 - `Datapackage` class for working with datapackages.
 - `Resource` class for working with resources.
 - `validate` function for validating datapackage descriptors.
 - Use remote or local datapackages
 - Use remote or local profiles


## Installation

> For now it's published in test mode. Please wait for publishing as `datapackage` before any usage except test usage.


```bash
$ npm install datapackage
```

## Example

```javascript
import { Datapackage } from 'datapackage'

new Datapackage('http://bit.do/datapackage-json').then(datapackage => {

  // Print datapackage descriptor
  console.log(datapackage.descriptor)

  // Print datapackage resources
  console.log(datapackage.resources)

  // Print resource data
  datapackage.resources[0].table(table => {
      table.read().then(data => {
          console.log(data)
      })
  })

  // Change datapackage name
  datapackage.update({name: 'Renamed datapackage'})
})
```

## Documentation

### Datapackage

A base class for working with datapackages. It provides means for modifying the datapackage descriptor and adding resources, handling validation on along the process.

```javascript
import { Datapackage } from 'datapackage'

new Datapackage('http://bit.do/datapackage-json', 'base', false).then(datapackage => {
  // see if datapackage is valid
  datapackage.valid

  // add new Resource
  const valid = datapackage.addResource({ name: "New resource" })

  // `addResource` returns the validation result of the changes
  if (!valid) {
    // see the errors why the package is invalid
    console.log(datapackage.errors)

    // output: [ 'Data does not match any schemas from "anyOf" in "/resources/1" schema path: "/properties/resources/items/anyOf"' ]
  }
})
```

### Constructor
#### **new Datapackage**([Object|String] **descriptor**, [Object|String] **profile**, [Boolean] **raiseInvalid**, [Boolean] **remoteProfiles**, [String] **basePath**)
##### **Returns:** Promise that resolves in Datapackage class instance or rejects with Array of descriptive errors.

 - **descriptor** is the only required argument and it represents the description of the Datapackage
 - **profile** (defaults to `base`) is the validation profile to validate the descriptor against. Available profiles are `base`, `tabular` and `fiscal`, but you can also provide your own profile Object for validation.
 - **raiseInvalid** (defaults to `true`) can be used to specify if you want a Array of descriptive errors to be throws if the datapacakge is invalid (or becomes invalid after modifying it), or to be able to work with datapackage which is in invalid state.
 - **remoteProfiles** (defaults to `false`) can be used to specify if you want to work with the local copies of the profiles or fetch the latest profiles from Internet.
 - **basePath** (defaults to empty string if the descriptor is an Object, the URL if it's a remote path or it's the `dirname` of the local path) can be used to specify the base path for the resources defined in the descriptor. Resources path is always appended to the `basePath`. The default behaviour of `basePath` is:
   - If initialized with path to a local file
     - default `basePath` is `dirname` of the path
     - any explicitly provided `basePath` to the constructor is appended to the default `basepath`
   - If initialized with a remote path
     - default `basePath` is the remote path
     - any explicitly provided `basePath` to the constructor is appended to the default `basePath`
   - If initialized with `Object`
     - default `basePath` is empty String (`''`)
     - any explicit `basePath` will be used as `basePath`
   - In case when the resource path is an absolute URL, `basePath` is disregarded and only the URL is used to fetch the resource.
   - Examples
     - `datapackage` is initialized with the `my-datapackages/datapackage.json` descriptor, the `basePath` is set to `data/` and the resource path is `november/resource.csv` the resource is expected to be in `my-datapackages/data/november/resource.cvs` relative of the directory where the library is executed.

### Class methods

#### .**update**({Object} **descriptor**)
##### **Returns:**  `true` or `false` for the validation status, or throws an Array of descriptive errors if `raiseInvalid` is set to `true`.

The `update` method provides a way for updating the Datapackage descriptor properties. The provided Object is merged with the current descriptor and this is validated against the specified `profile`.

**Note:** the objects are not deeply merged. Internally we use the `assignIn` method from Lodash.

####.**addResource**({Object} **resource**)
#####**Returns:**  `true` or `false` for the validation status, or throws an Array of descriptive errors if `raiseInvalid` is set to `true`.

Method for adding a resource to the datapackage.

### Class getters

#### .**valid**
##### **Returns**: `true` or `false` for the validation status of the datapackage. Datapackages are always valid if `raiseInvalid` is set to `true`.

#### .**errors**
**Returns**: an empty array if there are no errors, or array with strings if there are errors found.

#### .**descriptor**
##### **Returns**: the datapackage descriptor

#### .**resources**
##### **Returns**: array of `Resource` class objects

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
resource.source_type // inline
resource.source // descriptor.data

resource.table.headers // ['height', 'age', 'name]
resource.table.read() // [[180, 18, 'Tony'], [192, 32, 'Jacob']]
```

#### async Resource.load(descriptor, {basePath})

Factory method to instantiate `Resource` class. This method is async and it should be used with await keyword or as a `Promise`.

- descriptor (String/Object) - gets data resource descriptor as local path, url or object
- basePath (String) - gets base path for all relative pathes
- (Error) - raises error if resource can't be instantiated
- (Resource) - returns resource class instance

The descriptor will be:
- retrieved (if path/url)
- dereferenced (schema/dialect)
- expanded (with profile defaults)

#### resource.name

- (String) - returns resource name

#### resource.tabular

- (Boolean) - returns true if resource is tabular

#### resource.descriptor

- (Object) - returns resource descriptor

#### resource.sourceType

- (String) - returns based on resource data/path property:
  - inline
  - local
  - remote
  - multipart-local
  - multipart-remote

#### resource.source

- (any/String/String[]) - returns based on resource data/path property:
  - descriptor.data (inline)
  - descriptor.path[0] (local/remote)
  - descriptor.path (multipart-loca/remote)

#### resource.table

- (null/tableschema.Table) - returns table instance if resource is tabular

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

#### async Profile.load(profile)

Factory method to instantiate `Profile` class. This method is async and it should be used with await keyword or as a `Promise`.

- profile (String) - gets profile name in registry or URL to JSON Schema
- (Error) - raises error if profile not found in registry
- (Error) - raises error if JSON Schema can't be loaded
- (Profile) - returns profile class instance

#### profile.name

- (String/null) - returns profile name if available

#### profile.jsonschema

- (Object): returns profile JSON Schema contents

#### profile.validate(descriptor)

Validate a data package `descriptor` against the profile.

- descriptor (Object) - gets retrieved and dereferenced data package descriptor
- (Error) - raises with list of errors for invalid
- (Boolean) - returns true for valid

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

#### async validate(descriptor)

This funcion is async so it has to be used with `await` keyword or as a `Promise`.

- descriptor (String/Object) - gets data package descriptor (local/remote path or object)
- (Error) - raises list of validation errors for invalid
- (Boolean) - returns true for valid

## Contributing

The project follows the [Open Knowledge International coding standards](https://github.com/okfn/coding-standards). There are common commands to work with the project:

```
$ npm install
$ npm run test
$ npm run build
```
