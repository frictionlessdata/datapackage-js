import path from 'path'
import fetchMock from 'fetch-mock'

const fixturePath = name => path.join(__dirname
                                      , '../data/registry-fixtures'
                                      , name)

function _setupBaseAndTabularRegistryMocks(registryUrl) {
  const registry = (
      'id,title,schema,specification,schema_path\n' +
      'base,Data Package,http://example.com/baseProfile.json,http://example.com,baseProfile.json\n' +
      'tabular,Tabular Data Package,http://example.com/tabular_profile.json,http://example.com,tabular_profile.json\n'
    )
    , profiles = {
      base: '{"title": "base"}'
      , tabular: '{"title": "tabular"}'
    }

  fetchMock.mock(registryUrl, registry)
  fetchMock.mock('http://example.com/baseProfile.json', profiles.base)
  fetchMock.mock('http://example.com/tabular_profile.json', profiles.tabular)
}

export { fixturePath, _setupBaseAndTabularRegistryMocks, fetchMock }
