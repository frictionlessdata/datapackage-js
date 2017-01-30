const validate = require('../lib/index').validate

validate({ name: "Invalid Datapackage" }).then(validation => {
  if (validation instanceof Array) {
    // output the validation errors
    console.log(validation)
  }
})
