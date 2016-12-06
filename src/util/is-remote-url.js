function isRemoteURL(path) {
  return path.match(/\w+:\/\/.+/);
}

export default isRemoteURL;
