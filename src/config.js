// Module API

const IS_BROWSER = typeof window !== 'undefined'
const TABULAR_FORMATS = ['csv', 'tsv', 'xls', 'xlsx']
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
  skipInitialSpace: true,
  header: true,
  caseSensitiveHeader: false,
}

// System

module.exports = {
  IS_BROWSER,
  TABULAR_FORMATS,
  DEFAULT_DATA_PACKAGE_PROFILE,
  DEFAULT_RESOURCE_PROFILE,
  DEFAULT_RESOURCE_ENCODING,
  DEFAULT_FIELD_TYPE,
  DEFAULT_FIELD_FORMAT,
  DEFAULT_MISSING_VALUES,
  DEFAULT_DIALECT,
}
