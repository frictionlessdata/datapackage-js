import path from 'path';
import Utils from './utils'

const DEFAULT_REMOTE_PATH = 'http://schemas.datapackages.org/registry.csv'

let fs
let DEFAULT_LOCAL_PATH
if (!Utils.isBrowser) {
  fs = require('fs');
  DEFAULT_LOCAL_PATH = path.join(__dirname, '..', 'schemas', 'registry.csv')
}

class Registry {
  constructor(remote) {
    if (remote || Utils.isBrowser) {
      this._registry = this._loadRegistry(DEFAULT_REMOTE_PATH)
      this._base_path = this._loadBasePath(DEFAULT_REMOTE_PATH)
    } else {
      this._registry = this._loadRegistry(DEFAULT_LOCAL_PATH);
      this._base_path = this._loadBasePath(DEFAULT_LOCAL_PATH);
    }
  }

  get profiles() {
    // Returns the available profiles' metadata.
    return this._registry;
  }

  get basePath() {
    // If there's a Registry cache, returns its absolute base path
    return this._base_path;
  }

  get(profileId) {
    // Return the profile with the specified ID if it exists
    return this.profiles
      .then((registry) => registry[profileId])
      .then((profile) => this._loadProfile(profile));
  }

  _loadRegistry(pathOrURL) {
    return Utils.readFileOrURL(pathOrURL)
      .then((text) => Utils._csvParse(text))
      .then((registry) => this._groupProfilesById(registry));
  }

  _loadBasePath(pathOrURL) {
    if (!Utils.isBrowser && !Utils.isRemoteURL(pathOrURL)) {
      return path.dirname(path.resolve(pathOrURL));
    }
  }

  _loadProfile(profile) {
    if (!profile) {
      return undefined;
    }

    let profilePath;

    if (!Utils.isBrowser && this.basePath && profile.schema_path) {
      profilePath = path.join(this.basePath, profile.schema_path);
    } else {
      profilePath = profile.schema;
    }

    return Utils.readFileOrURL(profilePath)
      .then((text) => JSON.parse(text));
  }

  _groupProfilesById(registry) {
    const grouppedRegistry = {};

    for (const profile of registry) {
      grouppedRegistry[profile.id] = profile;
    }

    return grouppedRegistry;
  }
}

export default Registry;
