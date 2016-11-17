# DataPackage-js

[![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/frictionlessdata/chat)
[![Travis Build Status](https://travis-ci.org/frictionlessdata/datapackage-js.svg?branch=master)](https://travis-ci.org/frictionlessdata/datapackage-js)
[![Coverage Status](https://coveralls.io/repos/github/frictionlessdata/datapackage-js/badge.svg?branch=master)](https://coveralls.io/github/frictionlessdata/datapackage-js?branch=master)

A model for working with [Data Packages].

  [Data Packages]: http://dataprotocols.org/data-packages/


> Version v0.2.0 has renewed API introduced in NOT backward-compatibility manner. Previous version could be found [here](https://github.com/frictionlessdata/datapackage-js/tree/2bcf8e516fb1d871bd6b155962871f5cfd563c52).

## Installation

```
git clone https://github.com/frictionlessdata/datapackage-js.git
```

## Examples

### Reading a Data Package and its resource

### Validating a Data Package

### Retrieving all validation errors from a Data Package

### Creating a Data Package

### Using a schema that's not in the local cache

### Push/pull Data Package to storage

## Developer notes

These notes are intended to help people that want to contribute to this
package itself. If you just want to use it, you can safely ignore them.

### Updating the local schemas cache

We cache the schemas from <https://github.com/dataprotocols/schemas>
using git-subtree. To update it, use:

    git subtree pull --prefix datapackage/schemas https://github.com/dataprotocols/schemas.git master --squash