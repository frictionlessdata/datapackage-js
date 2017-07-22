// Module API

const DEFAULT_DATA_PACKAGE_PROFILE = 'data-package'
const DEFAULT_RESOURCE_PROFILE = 'data-resource'
const DEFAULT_RESOURCE_ENCODING = 'utf-8'
const DEFAULT_FIELD_TYPE = 'string'
const DEFAULT_FIELD_FORMAT = 'default'
const DEFAULT_MISSING_VALUES = ['']
const DEFAULT_DIALECT = {
  delimiter: ',',
  doubleQuote: true,
  lineTerminator: '\r\n',
  quoteChar: '"',
  escapeChar: '\\',
  skipInitialSpace: true,
  header: true,
  caseSensitiveHeader: false,
}


module.exports = {
  DEFAULT_DATA_PACKAGE_PROFILE,
  DEFAULT_RESOURCE_PROFILE,
  DEFAULT_RESOURCE_ENCODING,
  DEFAULT_FIELD_TYPE,
  DEFAULT_FIELD_FORMAT,
  DEFAULT_MISSING_VALUES,
  DEFAULT_DIALECT,
}
