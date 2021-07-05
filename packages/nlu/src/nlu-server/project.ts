import path from 'path'

export const setProjectLocation = () => {
  process.PROJECT_LOCATION = process.pkg
    ? path.dirname(process.execPath) // We point at the binary path
    : __dirname // e.g. /dist/..
}
