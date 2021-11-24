// This file is copied across all 4 node-bindings packages
import fs from 'fs'
import getos from 'getos'
import { Lock } from 'lock'
import path from 'path'
import yn from 'yn'
import orderBy from 'lodash.orderby'

import { binName } from './constants'

const fileName = `${binName}.node`
const packageName = `node-${binName}`
const customLocationEnv = `NODE_${binName.toUpperCase()}_DIR`
const verboseEnv = `NODE_${binName.toUpperCase()}_VERBOSE`

const defaultNativeExtensionsPath = path.join(__dirname, '..', 'native-extensions')
const envNativeExtensionsPath =
  process.env?.[customLocationEnv] && fs.existsSync(process.env[customLocationEnv]!) && process.env[customLocationEnv]

const nativeExtensionsPath = envNativeExtensionsPath || defaultNativeExtensionsPath

const verbose: boolean = !!yn(process.env[verboseEnv])
const debuglog = (...msg: any[]): void => {
  if (!verbose) {
    return
  }
  const prefix = `[${packageName.toUpperCase()}]`
  // eslint-disable-next-line no-console
  console.log(prefix, ...msg)
}

const requireExtension = (os: string, distribution: string) => {
  const filePath = path.join(nativeExtensionsPath, os, distribution, fileName)
  debuglog(`about to require file "${path.join('$basepath', os, distribution, fileName)}"`)
  return require(filePath)
}

const getOS = async (): Promise<getos.Os> => {
  return new Promise((resolve, reject) => {
    getos((err, distro) => {
      if (err) {
        reject(err)
      }
      resolve(distro)
    })
  })
}

const sanitizeDistribution = (os: getos.LinuxOs) => {
  return os.dist.toLowerCase().replace(/ |-|_|linux/g, '')
}

type ExtensionDir = Record<'dirName' | 'dist' | 'version', string>
const parseDirName = (dirName: string): ExtensionDir | undefined => {
  const [dist, ...semverParts] = dirName.split('_')
  if (!semverParts.length) {
    return
  }

  return {
    dirName,
    dist,
    version: semverParts.join('.')
  }
}

const initialize = async <T>(): Promise<T> => {
  debuglog('initializing...')
  debuglog(`using path "${nativeExtensionsPath}"`)

  const distro = await getOS()

  debuglog('operating system:', distro)

  if (distro.os === 'win32') {
    const binding = requireExtension('windows', 'all')
    debuglog('success')
    return binding
  }
  if (distro.os === 'darwin') {
    const binding = requireExtension('darwin', 'all')
    debuglog('success')
    return binding
  }

  if (distro.os === 'linux') {
    const distribution = sanitizeDistribution(distro)

    debuglog('linux distribution:', distribution)

    let relevantFolders: ExtensionDir[] = fs
      .readdirSync(path.join(nativeExtensionsPath, 'linux'))
      .map(parseDirName)
      .filter((x): x is ExtensionDir => !!x)
      .filter(({ dist }) => dist === distribution)
    relevantFolders = orderBy(relevantFolders, ({ version }) => version, 'desc')
    relevantFolders.push({
      dirName: 'default',
      dist: 'ubuntu',
      version: '18.04'
    })

    debuglog('relevant directories:', relevantFolders)

    for (const { dirName } of relevantFolders) {
      try {
        const binding = requireExtension('linux', dirName) // this might throw
        debuglog('success')
        return binding
      } catch (err) {
        debuglog('error occured: ', err)
      }
    }

    throw new Error(`Linux distribution ${distribution} is not supported by ${packageName}.`)
  }

  throw new Error(`The plateform ${distro.os} is not supported by ${packageName}.`)
}

interface Mutex {
  release: () => void
}

const _lock = Lock()
const acquireLock = (ressource: string): Promise<Mutex> => {
  return new Promise<Mutex>((resolve) => {
    _lock(ressource, (releaser) => {
      resolve({ release: releaser() })
    })
  })
}

let binding: any | undefined
export const getBinding = async <T>() => {
  if (binding) {
    return binding
  }

  const mutex = await acquireLock(binName)
  if (binding) {
    mutex.release()
    return binding
  }

  binding = await initialize()

  mutex.release()
  return binding
}
