# DataPackage-js

[![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/frictionlessdata/chat) [![Travis Build Status](https://travis-ci.org/frictionlessdata/datapackage-js.svg?branch=master)](https://travis-ci.org/frictionlessdata/datapackage-js) [![Coverage Status](https://coveralls.io/repos/github/frictionlessdata/datapackage-js/badge.svg?branch=master)](https://coveralls.io/github/frictionlessdata/datapackage-js?branch=master)

A model for working with [Data Packages].

> Version v0.2.0 has renewed API introduced in NOT backward-compatibility manner. Previous version could be found [here](https://github.com/frictionlessdata/datapackage-js/tree/2bcf8e516fb1d871bd6b155962871f5cfd563c52).


##Features

 - `Datapackage` class for working with datapackages.
 - `Resource` class for working with resources.
 - `Profiles` class for working with profiles.
 - `validate` function for validating datapackage descriptors.
 - Use remote or local datapackages
 - Use remote or local profiles


##Installation

```
git clone  https://github.com/frictionlessdata/datapackage-js.git
cd datapackage-js
npm install
npm test
```

##Example

```
import Datapackage from 'datapackage'

new Datapackage('http://bit.do/datapackage-json').then(datapackage => {

	# Print datapackage descriptor
	console.log(datapackage.descriptor)

	# Print datapackage resources
	console.log(datapackage.resources)

	# Print resource data
	datapackage.resources[0].table(table => {
		table.read().then(data => {
			console.log(data)
		})
	})

	# Change datapackage name
	datapackage.update({name: 'Renamed datapackage'})
})
```


##Datapackage

A base class for working with datapackages. It provides means for modifying the datapackage descriptor and adding resources, handling validation on along the process.

```
import Datapackage from 'datapackage'

new Datapackage('http://bit.do/datapackage-json', 'base', false).then(datapackage => {
	# see if datapackage is valid
	datapackage.valid

    # add new Resource
    const valid = datapackage.addResource({ name: "New resource" })

	# `addResource` returns the validation result of the changes
	if (!valid) {
		# see the errors why the package is invalid
		console.log(datapackage.errors)

		# output: [ 'Data does not match any schemas from "anyOf" in "/resources/1" schema path: "/properties/resources/items/anyOf"' ]
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
 - **basePath** (defaults to `null`if the descriptor is an Object or a remote path, or it's the `dirname` of the local path) can be used to specify the base path for the resources defined in the descriptor. For example if the resource path is `data/resource.cvs` and the `basePath` is set to `datapackages/dp1` the resources are expected to be in `datapackages/dp1/data/resource.cvs` relative of the directory where the library is executed.

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
```
import { Resources } from 'datapackage'

const resourceData = [[180, 18, 'Tony'], [192, 32, 'Jacob']]
	, resourceSchema = {
                        "fields": [
                            {
                              "name": "height",
                              "type": "integer"
                            },
                            {
                              "name": "age",
                              "type": "integer"
                            },
                            {
                              "name": "name",
                              "type": "string"
                            }
                          ]
                        }
    , resource = new Resource({ data: resourceData, schema: resourceSchema })

# output the resource type
console.log(resource.type)

# if data is inline as in this example, you can get it with the `source` getter
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


##Profiles

```
import { Profiles } from 'datapackage'

# use remote profiles
new Profiles(true).then(profiles => {
	# output the fiscal profile
	const fiscalProfile = profiles.retrieve('fiscal')
	console.log(fiscalProfile)
})
```

A class for working with validation profiles.

###Constructor
####**new Profiles**({Boolean} **remote**)
#####**Returns**: a Promise that resolves in a class instance or rejects with Array of errors

 - **remote** is a option argument to to specify if you want to use the remote profiles or use the local copies

###Class methods
####**.retrieve**({String} **profile**)
#####**Returns**: the profile Object specified

 - **profile** (defaults to `base`) is an optional argument to specify the id of the profile to retrive

####**.validate**({Object} **descriptor**, {Object|String} **profile**)
#####**Returns**: `true` for valid descriptor or Array of string errors if the validation failed

 - **descriptor** the datapackage descriptor to validate
 - **profile** (defaults to `base`) is an id of the profile for the descriptor to be validated against or a Object profile


##validate

```
import { validate } from 'datapackage'

validate({ name: "Invalid Datapackage" }).then(validation => {
	if (validation instanceof Array) {
		# output the validation errors
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
```
npm run check-schemas
```

If newer profiles are available you can update the local copies by running:
```
npm run update-schemas
```


[Data Packages]: http://dataprotocols.org/data-packages/
[assignIn]: https://lodash.com/docs/4.17.2#assignIn
[jsontableschema-js]: https://github.com/frictionlessdata/jsontableschema-js