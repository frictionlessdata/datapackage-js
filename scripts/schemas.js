/* eslint no-console: "off" */
import fs from 'fs'
import 'isomorphic-fetch'
import path from 'path'
import _ from 'lodash'
import utils from '../src/utils'


// Main

const registryURL = 'http://schemas.datapackages.org/registry.json'
const schemasDir = path.join(__dirname, '..', 'src', 'schemas')
const firstArg = process.argv[2]

if (firstArg === 'check') {
  console.log('checking')
  fetch(registryURL).then(res => res.text())
    .then(text => {
      const local = fs.readFileSync(path.join(schemasDir, 'registry.json'), 'utf8')
      if (local === text) {
        console.log('Schemas up to date!')
        process.exit(0)
      }

      console.log('New schemas available. Run "npm run schemas:update" to update.')
      process.exit(-1)
    })
} else if (firstArg === 'update') {
  fetch(registryURL).then(res => res.text())
    .then(text => {
      fs.writeFileSync(path.join(schemasDir, 'registry.json'), text)
      return utils._csvParse(text)
    }).then(registry => {
      _.forEach(registry, profile => {
        fetch(profile.schema).then(res => res.text())
          .then(text => {
            fs.writeFileSync(path.join(schemasDir, profile.schema_path), text)
          })
      })
    })
}
