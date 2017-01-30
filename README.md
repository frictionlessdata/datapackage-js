# datapackage-js

[![Travis Build Status](https://travis-ci.org/frictionlessdata/datapackage-js.svg?branch=master)](https://travis-ci.org/frictionlessdata/datapackage-js)
[![Coverage Status](https://coveralls.io/repos/github/frictionlessdata/datapackage-js/badge.svg?branch=master)](https://coveralls.io/github/frictionlessdata/datapackage-js?branch=master)
[![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/frictionlessdata/chat)

A model for working with [Data Packages].

> Version v0.2.0 has renewed API introduced in NOT backward-compatibility manner. Previous version could be found [here](https://github.com/frictionlessdata/datapackage-js/tree/2bcf8e516fb1d871bd6b155962871f5cfd563c52).


##Features

 - `Datapackage` class for working with datapackages.
 - `Resource` class for working with resources.
 - `validate` function for validating datapackage descriptors.
 - Use remote or local datapackages
 - Use remote or local profiles


##Installation

> For now it's published in test mode. Please wait for publishing as `datapackage` before any usage except test usage.


```bash
$ npm install datapackage-test
```

##Example

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

##Datapackage

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

###Constructor
####**new Datapackage**([Object|String] **descriptor**, [Object|String] **profile**, [Boolean] **raiseInvalid**, [Boolean] **remoteProfiles**, [String] **basePath**)
#####**Returns:** Promise that resolves in Datapackage class instance or rejects with Array of descriptive errors.

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

###Class methods

####.**update**({Object} **descriptor**)
#####**Returns:**  `true` or `false` for the validation status, or throws an Array of descriptive errors if `raiseInvalid` is set to `true`.

The `update` method provides a way for updating the Datapackage descriptor properties. The provided Object is merged with the current descriptor and this is validated against the specified `profile`.

**Note:** the objects are not deeply merged. Internally we use the [assignIn] method from Lodash.

####.**addResource**({Object} **resource**)
#####**Returns:**  `true` or `false` for the validation status, or throws an Array of descriptive errors if `raiseInvalid` is set to `true`.

Method for adding a resource to the datapackage.

###Class getters

####.**valid**
#####**Returns**: `true` or `false` for the validation status of the datapackage. Datapackages are always valid if `raiseInvalid` is set to `true`.

####.**errors**
**Returns**: an empty array if there are no errors, or array with strings if there are errors found.

####.**descriptor**
#####**Returns**: the datapackage descriptor

####.**resources**
#####**Returns**: array of `Resource` class objects

##Resource

A class for working with resources. You can read or iterate resources with the `table` method.

```javascript
import { Resources } from 'datapackage'

const resourceData = [[180, 18, 'Tony'], [192, 32, 'Jacob']]
const resourceSchema = {
  fields: [
    {
      name: 'height',
      type: 'integer',
    },
    {
      name: 'age',
      type: 'integer',
    },
    {
      name: 'name',
      type: 'string',
    },
  ],
}
const resource = new Resource({ data: resourceData, schema: resourceSchema })

// output the resource type
console.log(resource.type)

// if data is inline as in this example, you can get it with the `source` getter
console.log(resource.source)
```

###Constructor
####**new Resources**({Object} **descriptor**, {String} **basePath**)
#####**Returns**: Promise that resolves in a class instance or rejects with Array of errors.

 - **descriptor** is a required argument representing the description of the Resource
 - **basePath** (defaults to `null`) is the path prepended to the path of the resource

###Class getters
####.**table**
#####**Returns**: a [jsontableschema-js] Table instance of the resource.

JSON Table Schema ([specs](http://specs.frictionlessdata.io/json-table-schema)) is a json representation for tabular data. Using the [Table](https://github.com/frictionlessdata/jsontableschema-js#table) instance you can iterate and read over the data.

####.**descriptor**
#####**Returns**: the resource descriptor

####.**name**
#####**Returns**: the name of the resource

####.**type**
#####**Returns**: the type of the resource which can be `inline`, `remote` or `local`

####.**source**
#####**Returns**: the resource data if the resource is `inline`, the path if the resource is remote or the path prepended with the `basePath` if the resource is `local`

##validate

```javascript
import { validate } from 'datapackage'

validate({ name: "Invalid Datapackage" }).then(validation => {
  if (validation instanceof Array) {
    // output the validation errors
    console.log(validation)
  }
}
```

A wrapper function around `Profiles.validate` for validating datapackages.

####**validate**({Object} **descriptor**, {String} **profile**, {Boolean} **remoteProfiles**)
**Returns**: a Promise that resolves in `true` or Array of string errors, or rejects with Error if something went wrong with fetching the profiles

 - **descriptor** the datapackage descriptor to validate
 - **profile** (defaults to `base`) the id of the profile to validate against
 - **remoteProfiles** (defaults to `false`) whether to use the remote profiles or the locally cached ones


###Updating the local profiles

You can check whether there are newer profiles available by running:

```bash
$ npm run schemas:check
```

If newer profiles are available you can update the local copies by running:

```bash
$ npm run schemas:update
```

###Running the usage examples

There are documented usage examples in the `examples` directory. In order to run the examples you must first build the
library. To build the library run:

```
npm run build:lib
```

After that, you can run the examples with `node`, for example:

```
node examples/datapackage.js
```

[Data Packages]: http://dataprotocols.org/data-packages/
[assignIn]: https://lodash.com/docs/4.17.2#assignIn
[jsontableschema-js]: https://github.com/frictionlessdata/jsontableschema-js
