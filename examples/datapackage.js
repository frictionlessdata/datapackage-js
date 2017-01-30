const Datapackage = require('../lib/index').Datapackage
const DATAPACKAGE_URL = 'https://raw.githubusercontent.com/frictionlessdata/datapackage-js/master/data/dp2-tabular/datapackage.json'

// Create new datapackage from remote descriptor, using 'base' profile
// and 'raiseInvalid' set to false
new Datapackage(DATAPACKAGE_URL, 'tabular', false).then(datapackage => {
  // see if datapackage is valid
  console.log('datapackage.valid: ', datapackage.valid)

  // Add new Resource
  const valid = datapackage.addResource({ name: 'New resource' })

  // `addResource` returns the validation result of the changes
  if (!valid) {
    // see the errors why the package is invalid
    console.log('\nThe following errors are found: ', datapackage.errors)
  }

  // Now the datapackage is marked as invalid
  console.log('\ndatapackage.valid: ', datapackage.valid)

  // `Datapackage.resources` getter returns array of valid Resource objects
  datapackage.resources.forEach((element, index) => {
    console.log(`\nResource number ${index} is named "${element.name}".
The Resource object is:\n${JSON.stringify(element)}`)
  })

  // But the contents of the valid resources can be read
  // Note: `Resource.table` returns `jsontableschema.Table` instance.
  // For usage details please see https://github.com/frictionlessdata/jsontableschema-js#table
  datapackage.resources[0].table.then(table => {
    return table.read()
  }).then(data => {
    console.log(`\nResource named "${datapackage.resources[0].name}" contains this data:`)
    console.log(data)
  })

  // Updating the descriptor fields is done trough `Datapackage.update` method
  console.log('\nOld datapackage name: ', datapackage.descriptor.name)
  datapackage.update({ name: 'Changed name'})
  console.log('New datapackage name: ', datapackage.descriptor.name)

}).catch(err => {
  console.loge(err)
})
