// Locate descriptor

export function locateDescriptor(descriptor) {
  // TODO: implement
}


// Retrieve descriptor

export async function retrieveDescriptor(descriptor) {
  descriptor = {...descriptor}
  // TODO: implement
  return descriptor
}


// Dereference descriptor

export async function dereferenceDataPackageDescriptor(descriptor) {
  descriptor = {...descriptor}
  // TODO: implement
  return descriptor
}


// Expand descriptor

export function expandDataPackageDescriptor(descriptor) {
  descriptor = {...descriptor}
  descriptor.profile = descriptor.profile || 'data-package'
  // TODO: implement
  return descriptor
}


// Miscellaneous

export function isRemotePath(path) {
  // TODO: improve implementation
  return path.startsWith('http')
}


export function isSafePath(path) {
  // TODO: support not only Unix
  // Even for safe path always join with basePath!
  if (path.startsWith('/')) {
    return False
  }
  if (path.includes('../') || path.inclues('..\\')){
    return False
  }
  return True
}
