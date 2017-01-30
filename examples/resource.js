const Resource = require('../lib/index').Resource

const resourceData = [
  [180, 18, 'Tony'],
  [192, 15, 'Pavle'],
  [160, 32, 'Pero'],
  [202, 23, 'David'],
]

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

// Create a resource that contains inline data with appropriate resourceSchema
let resource = new Resource({ data: resourceData, schema: resourceSchema })

// Display the resource type. Could be inline, remote or local.
// Here we have our data inline.
console.log('First resource type: ', resource.type)

// When working with inline data it can be fetched with `Resource.source`
console.log('First resource source: ', resource.source)

// Create a new resource with remote data
const remoteResourceDescriptor = {
                                    "name": "random",
                                    "format": "csv",
                                    "path": "https://raw.githubusercontent.com/frictionlessdata/datapackage-js/master/data/dp1/data.csv",
                                    "schema": {
                                      "fields": [
                                        {
                                          "name": "name",
                                          "type": "string"
                                        },
                                        {
                                          "name": "size",
                                          "type": "number"
                                        }
                                      ]
                                    }
                                  }
resource = new Resource(remoteResourceDescriptor)

// This resource is remote
console.log('\nSecond resource type: ', resource.type)

// Now `Resource.source` displays the URL where the data can be found
console.log('Second resource source: ', resource.source)

// To see the data, we must initialize `jsontableschema.Table` and read from there.
// The Table class can be initialized with Resource.table.
// More: https://github.com/frictionlessdata/jsontableschema-js#table
resource.table.then(table => {
  return table.read()
}).then(data => {
  console.log('Second resource data:')
  console.log(data)
})
