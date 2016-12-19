import fs from 'fs'
import 'isomorphic-fetch'
import path from 'path'
import _ from 'lodash'

import utils from './utils'

const registryURL = 'http://schemas.datapackages.org/registry.csv'
  , schemasDir = path.join(__dirname, '..', 'schemas')
  , firstArg = process.argv[2]

if (firstArg === 'check-schemas') {
  console.log('checking')
  fetch(registryURL).then(res => res.text())
    .then(text => {
      const local = fs.readFileSync(path.join(schemasDir, 'registry.csv'),
                                    'utf8')
      if (local === text) {
        console.log('Schemas up to date!')
        process.exit(0)
      }

      console.log('New schemas available. Run "npm run update-schemas" to update.')
      process.exit(-1)
    })
} else if (firstArg === 'update-schemas') {
  fetch(registryURL).then(res => res.text())
    .then(text => {
      fs.writeFileSync(path.join(schemasDir, 'registry.csv'), text)
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

/* eslint no-console: "off" */
