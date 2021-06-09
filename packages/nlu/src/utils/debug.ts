const debug = require('debug')

const available = {}

export const Debug = (mod: string, base = 'bp:nlu') => {
  const namespace = base + ':' + mod
  available[namespace] = true

  const instance = debug(base).extend(mod)
  instance.sub = (mod) => Debug(mod, namespace)

  return instance
}

export const getDebugScopes = () => {
  const status = {}
  Object.keys(available).forEach((key) => (status[key] = debug.enabled(key)))
  return status
}

export const getDebugString = (): string => {
  return Object.keys(available)
    .filter((key) => debug.enabled(key))
    .join(',')
}

export const setDebugScopes = (scopes: string) => {
  debug.disable()
  debug.enable(scopes)

  scopes.split(',').forEach((key) => (available[key] = debug.enabled(key)))
}

debug.log = function (...args) {
  global.printLog(args)
}

global.DEBUG = Debug
