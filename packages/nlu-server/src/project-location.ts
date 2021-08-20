import path from 'path'

export const getProjectLocation = () => {
  return process.pkg
    ? path.dirname(process.execPath) // We point at the binary path
    : __dirname // e.g. /dist/..
}
