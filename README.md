# datapackage-js

[![Build](https://img.shields.io/github/workflow/status/frictionlessdata/tableschema-js/general/main)](https://github.com/frictionlessdata/datapackage-js/actions)
[![Coverage](https://img.shields.io/codecov/c/github/frictionlessdata/datapackage-js/main)](https://codecov.io/gh/frictionlessdata/datapackage-js)
[![Registry](https://img.shields.io/npm/v/frictionless-datapackage-js.svg)](https://www.npmjs.com/package/frictionless-datapackage-js)
[![Codebase](https://img.shields.io/badge/github-main-brightgreen)](https://github.com/frictionlessdata/datapackage-js)
[![Support](https://img.shields.io/badge/support-discord-brightgreen)](https://discordapp.com/invite/Sewv6av)

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
- [Documentation](#documentation)
  - [Introduction](#introduction)
  - [Working with Package](#working-with-package)
  - [Working with Resource](#working-with-resource)
  - [Working with Profile](#working-with-profile)
  - [Working with validate/infer](#working-with-validateinfer)
  - [Working with Foreign Keys](#working-with-foreign-keys)
- [API Referencer](#api-referencer)
  - [Package](#package)
  - [Resource](#resource)
  - [Profile](#profile)
  - [validate(descriptor) ⇒ `Object`](#validatedescriptor-%E2%87%92-codeobjectcode)
  - [infer(pattern) ⇒ `Object`](#inferpattern-%E2%87%92-codeobjectcode)
  - [DataPackageError](#datapackageerror)
  - [TableSchemaError](#tableschemaerror)
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

## Documentation

### Introduction

Let's start with a simple example for Node.js:

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

And for browser:

> https://jsfiddle.net/rollninja/jp60q3zd/

After the script registration the library will be available as a global variable `datapackage`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>datapackage-js</title>
  </head>
  <body>
    <script src="//unpkg.com/datapackage/dist/datapackage.min.js"></script>
    <script>
      const main = async () => {
        const resource = await datapackage.Resource.load({path: 'https://raw.githubusercontent.com/frictionlessdata/datapackage-js/master/data/data.csv'})
        const rows = await resource.read()
        document.body.innerHTML += `<div>${resource.headers}</div>`
        for (const row of rows) {
          document.body.innerHTML += `<div>${row}</div>`
        }
      }
      main()
    </script>
  </body>
</html>
```

### Working with Package

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

### Working with Resource

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

### Working with Profile

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

### Working with validate/infer

A standalone function to validate a data package descriptor:

```javascript
const {valid, errors} = await validate({name: 'Invalid Datapackage'})
for (const error of errors) {
  // inspect Error objects
}
```

### Working with Foreign Keys

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

## API Referencer

### Package
Package representation


* [Package](#Package)
    * _instance_
        * [.valid](#Package+valid) ⇒ `Boolean`
        * [.errors](#Package+errors) ⇒ `Array.&lt;Error&gt;`
        * [.profile](#Package+profile) ⇒ `Profile`
        * [.descriptor](#Package+descriptor) ⇒ `Object`
        * [.resources](#Package+resources) ⇒ `Array.&lt;Resoruce&gt;`
        * [.resourceNames](#Package+resourceNames) ⇒ `Array.&lt;string&gt;`
        * [.getResource(name)](#Package+getResource) ⇒ `Resource` \| `null`
        * [.addResource(descriptor)](#Package+addResource) ⇒ `Resource`
        * [.removeResource(name)](#Package+removeResource) ⇒ `Resource` \| `null`
        * [.infer(pattern)](#Package+infer) ⇒ `Object`
        * [.commit(strict)](#Package+commit) ⇒ `Boolean`
        * [.save(target, raises, returns)](#Package+save)
    * _static_
        * [.load(descriptor, basePath, strict)](#Package.load) ⇒ [`Package`](#Package)


#### package.valid ⇒ `Boolean`
Validation status

It always `true` in strict mode.

**Returns**: `Boolean` - returns validation status

#### package.errors ⇒ `Array.&lt;Error&gt;`
Validation errors

It always empty in strict mode.

**Returns**: `Array.&lt;Error&gt;` - returns validation errors

#### package.profile ⇒ `Profile`
Profile


#### package.descriptor ⇒ `Object`
Descriptor

**Returns**: `Object` - schema descriptor

#### package.resources ⇒ `Array.&lt;Resoruce&gt;`
Resources


#### package.resourceNames ⇒ `Array.&lt;string&gt;`
Resource names


#### package.getResource(name) ⇒ `Resource` \| `null`
Return a resource

**Returns**: `Resource` \| `null` - resource instance if exists

| Param | Type |
| --- | --- |
| name | `string` |


#### package.addResource(descriptor) ⇒ `Resource`
Add a resource

**Returns**: `Resource` - added resource instance

| Param | Type |
| --- | --- |
| descriptor | `Object` |


#### package.removeResource(name) ⇒ `Resource` \| `null`
Remove a resource

**Returns**: `Resource` \| `null` - removed resource instance if exists

| Param | Type |
| --- | --- |
| name | `string` |


#### package.infer(pattern) ⇒ `Object`
Infer metadata


| Param | Type | Default |
| --- | --- | --- |
| pattern | `string` | `false` |


#### package.commit(strict) ⇒ `Boolean`
Update package instance if there are in-place changes in the descriptor.

**Returns**: `Boolean` - returns true on success and false if not modified
**Throws**:

- `DataPackageError` raises any error occurred in the process


| Param | Type | Description |
| --- | --- | --- |
| strict | `boolean` | alter `strict` mode for further work |

**Example**
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

#### package.save(target, raises, returns)
Save data package to target destination.

If target path has a  zip file extension the package will be zipped and
saved entirely. If it has a json file extension only the descriptor will be saved.


| Param | Type | Description |
| --- | --- | --- |
| target | `string` | path where to save a data package |
| raises | `DataPackageError` | error if something goes wrong |
| returns | `boolean` | true on success |


#### Package.load(descriptor, basePath, strict) ⇒ [`Package`](#Package)
Factory method to instantiate `Package` class.

This method is async and it should be used with await keyword or as a `Promise`.

**Returns**: [`Package`](#Package) - returns data package class instance
**Throws**:

- `DataPackageError` raises error if something goes wrong


| Param | Type | Description |
| --- | --- | --- |
| descriptor | `string` \| `Object` | package descriptor as local path, url or object.   If ththe path has a `zip` file extension it will be unzipped   to the temp directory first. |
| basePath | `string` | base path for all relative paths |
| strict | `boolean` | strict flag to alter validation behavior.   Setting it to `true` leads to throwing errors on any operation   with invalid descriptor |


### Resource
Resource representation


* [Resource](#Resource)
    * _instance_
        * [.valid](#Resource+valid) ⇒ `Boolean`
        * [.errors](#Resource+errors) ⇒ `Array.&lt;Error&gt;`
        * [.profile](#Resource+profile) ⇒ `Profile`
        * [.descriptor](#Resource+descriptor) ⇒ `Object`
        * [.name](#Resource+name) ⇒ `string`
        * [.inline](#Resource+inline) ⇒ `boolean`
        * [.local](#Resource+local) ⇒ `boolean`
        * [.remote](#Resource+remote) ⇒ `boolean`
        * [.multipart](#Resource+multipart) ⇒ `boolean`
        * [.tabular](#Resource+tabular) ⇒ `boolean`
        * [.source](#Resource+source) ⇒ `Array` \| `string`
        * [.headers](#Resource+headers) ⇒ `Array.&lt;string&gt;`
        * [.schema](#Resource+schema) ⇒ `tableschema.Schema`
        * [.iter(keyed, extended, cast, forceCast, relations, stream)](#Resource+iter) ⇒ `AsyncIterator` \| `Stream`
        * [.read(limit)](#Resource+read) ⇒ `Array.&lt;Array&gt;` \| `Array.&lt;Object&gt;`
        * [.checkRelations()](#Resource+checkRelations) ⇒ `boolean`
        * [.rawIter(stream)](#Resource+rawIter) ⇒ `Iterator` \| `Stream`
        * [.rawRead()](#Resource+rawRead) ⇒ `Buffer`
        * [.infer()](#Resource+infer) ⇒ `Object`
        * [.commit(strict)](#Resource+commit) ⇒ `boolean`
        * [.save(target)](#Resource+save) ⇒ `boolean`
    * _static_
        * [.load(descriptor, basePath, strict)](#Resource.load) ⇒ [`Resource`](#Resource)


#### resource.valid ⇒ `Boolean`
Validation status

It always `true` in strict mode.

**Returns**: `Boolean` - returns validation status

#### resource.errors ⇒ `Array.&lt;Error&gt;`
Validation errors

It always empty in strict mode.

**Returns**: `Array.&lt;Error&gt;` - returns validation errors

#### resource.profile ⇒ `Profile`
Profile


#### resource.descriptor ⇒ `Object`
Descriptor

**Returns**: `Object` - schema descriptor

#### resource.name ⇒ `string`
Name


#### resource.inline ⇒ `boolean`
Whether resource is inline


#### resource.local ⇒ `boolean`
Whether resource is local


#### resource.remote ⇒ `boolean`
Whether resource is remote


#### resource.multipart ⇒ `boolean`
Whether resource is multipart


#### resource.tabular ⇒ `boolean`
Whether resource is tabular


#### resource.source ⇒ `Array` \| `string`
Source

Combination of `resource.source` and `resource.inline/local/remote/multipart`
provides predictable interface to work with resource data.


#### resource.headers ⇒ `Array.&lt;string&gt;`
Headers

> Only for tabular resources

**Returns**: `Array.&lt;string&gt;` - data source headers

#### resource.schema ⇒ `tableschema.Schema`
Schema

> Only for tabular resources


#### resource.iter(keyed, extended, cast, forceCast, relations, stream) ⇒ `AsyncIterator` \| `Stream`
Iterate through the table data

> Only for tabular resources

And emits rows cast based on table schema (async for loop).
With a `stream` flag instead of async iterator a Node stream will be returned.
Data casting can be disabled.

**Returns**: `AsyncIterator` \| `Stream` - async iterator/stream of rows:
 - `[value1, value2]` - base
 - `{header1: value1, header2: value2}` - keyed
 - `[rowNumber, [header1, header2], [value1, value2]]` - extended
**Throws**:

- `TableSchemaError` raises any error occurred in this process


| Param | Type | Description |
| --- | --- | --- |
| keyed | `boolean` | iter keyed rows |
| extended | `boolean` | iter extended rows |
| cast | `boolean` | disable data casting if false |
| forceCast | `boolean` | instead of raising on the first row with cast error   return an error object to replace failed row. It will allow   to iterate over the whole data file even if it's not compliant to the schema.   Example of output stream:     `[['val1', 'val2'], TableSchemaError, ['val3', 'val4'], ...]` |
| relations | `boolean` | if true foreign key fields will be   checked and resolved to its references |
| stream | `boolean` | return Node Readable Stream of table rows |


#### resource.read(limit) ⇒ `Array.&lt;Array&gt;` \| `Array.&lt;Object&gt;`
Read the table data into memory

> Only for tabular resources; the API is the same as `resource.iter` has except for:

**Returns**: `Array.&lt;Array&gt;` \| `Array.&lt;Object&gt;` - list of rows:
 - `[value1, value2]` - base
 - `{header1: value1, header2: value2}` - keyed
 - `[rowNumber, [header1, header2], [value1, value2]]` - extended

| Param | Type | Description |
| --- | --- | --- |
| limit | `integer` | limit of rows to read |


#### resource.checkRelations() ⇒ `boolean`
It checks foreign keys and raises an exception if there are integrity issues.

> Only for tabular resources

**Returns**: `boolean` - returns True if no issues
**Throws**:

- `DataPackageError` raises if there are integrity issues


#### resource.rawIter(stream) ⇒ `Iterator` \| `Stream`
Iterate over data chunks as bytes. If `stream` is true Node Stream will be returned.

**Returns**: `Iterator` \| `Stream` - returns Iterator/Stream

| Param | Type | Description |
| --- | --- | --- |
| stream | `boolean` | Node Stream will be returned |


#### resource.rawRead() ⇒ `Buffer`
Returns resource data as bytes.

**Returns**: `Buffer` - returns Buffer with resource data

#### resource.infer() ⇒ `Object`
Infer resource metadata like name, format, mediatype, encoding, schema and profile.

It commits this changes into resource instance.

**Returns**: `Object` - returns resource descriptor

#### resource.commit(strict) ⇒ `boolean`
Update resource instance if there are in-place changes in the descriptor.

**Returns**: `boolean` - returns true on success and false if not modified
**Throws**:

- DataPackageError raises error if something goes wrong


| Param | Type | Description |
| --- | --- | --- |
| strict | `boolean` | alter `strict` mode for further work |


#### resource.save(target) ⇒ `boolean`
Save resource to target destination.

> For now only descriptor will be saved.

**Returns**: `boolean` - returns true on success
**Throws**:

- `DataPackageError` raises error if something goes wrong


| Param | Type | Description |
| --- | --- | --- |
| target | `string` | path where to save a resource |


#### Resource.load(descriptor, basePath, strict) ⇒ [`Resource`](#Resource)
Factory method to instantiate `Resource` class.

This method is async and it should be used with await keyword or as a `Promise`.

**Returns**: [`Resource`](#Resource) - returns resource class instance
**Throws**:

- `DataPackageError` raises error if something goes wrong


| Param | Type | Description |
| --- | --- | --- |
| descriptor | `string` \| `Object` | resource descriptor as local path, url or object |
| basePath | `string` | base path for all relative paths |
| strict | `boolean` | strict flag to alter validation behavior.   Setting it to `true` leads to throwing errors on   any operation with invalid descriptor |


### Profile
Profile representation


* [Profile](#Profile)
    * _instance_
        * [.name](#Profile+name) ⇒ `string`
        * [.jsonschema](#Profile+jsonschema) ⇒ `Object`
        * [.validate(descriptor)](#Profile+validate) ⇒ `Object`
    * _static_
        * [.load(profile)](#Profile.load) ⇒ [`Profile`](#Profile)


#### profile.name ⇒ `string`
Name


#### profile.jsonschema ⇒ `Object`
JsonSchema


#### profile.validate(descriptor) ⇒ `Object`
Validate a data package `descriptor` against the profile.

**Returns**: `Object` - returns a `{valid, errors}` object

| Param | Type | Description |
| --- | --- | --- |
| descriptor | `Object` | retrieved and dereferenced data package descriptor |


#### Profile.load(profile) ⇒ [`Profile`](#Profile)
Factory method to instantiate `Profile` class.

This method is async and it should be used with await keyword or as a `Promise`.

**Returns**: [`Profile`](#Profile) - returns profile class instance
**Throws**:

- `DataPackageError` raises error if something goes wrong


| Param | Type | Description |
| --- | --- | --- |
| profile | `string` | profile name in registry or URL to JSON Schema |


### validate(descriptor) ⇒ `Object`
This function is async so it has to be used with `await` keyword or as a `Promise`.

**Returns**: `Object` - returns a `{valid, errors}` object

| Param | Type | Description |
| --- | --- | --- |
| descriptor | `string` \| `Object` | data package descriptor (local/remote path or object) |


### infer(pattern) ⇒ `Object`
This function is async so it has to be used with `await` keyword or as a `Promise`.

**Returns**: `Object` - returns data package descriptor

| Param | Type | Description |
| --- | --- | --- |
| pattern | `string` | glob file pattern |


### DataPackageError
Base class for the all DataPackage errors.


### TableSchemaError
Base class for the all TableSchema errors.


## Contributing

> The project follows the [Open Knowledge International coding standards](https://github.com/okfn/coding-standards). There are common commands to work with the project:

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
