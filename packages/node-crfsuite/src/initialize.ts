/**
 * Description:
 *  This file is copied across all 4 node-bindings packages.
 *
 *  The reason is we can't extract common logic in a dedicated package
 *  as some node bindings are published on the public npm registry and
 *  we try not publishing npm packages for no reason.
 *
 *  This code is deliberately kept in a single file to facilitate
 *  copy/pasting across multiple node-bindings package and not to
 *  mess up relative paths to native-extensions.
 *
 * Usage:
 *  The following environment variables can be used to customize
 *  which extension is loaded at runtime:
 *
 *  1. NATIVE_EXTENSIONS_DIR="/my/dir" # allows changing the extension directory for all packages
 *  2. NODE_${PACKAGE}_DIR="/my/dir" # allows changing the extension directory for a single package
 *  3. NODE_${PACKAGE}_BIN="/my/dir/myfile.node" # allows specifying which file to load
 *  4. NODE_${PACKAGE}_VERBOSE=1 # enables debug logs to trouble shoot an extension not loading
 */

/**
 * ###############
 * ### imports ###
 * ###############
 */
import fs from 'fs'
import getos from 'getos'
import { Lock } from 'lock'
import path from 'path'
import yn from 'yn'
import { binName } from './constants'

/**
 * ###############
 * ### typings ###
 * ###############
 */
type ExtensionDir = Record<'dirName' | 'dist' | 'version', string>

type Mutex = {
  release: () => void
}

/**
 * #################
 * ### constants ###
 * #################
 */
const binFileName = `${binName}.node`
const packageName = `node-${binName}`

const customGlobalDirLocationEnv = 'NATIVE_EXTENSIONS_DIR'
const customDirLocationEnv = `NODE_${binName.toUpperCase()}_DIR`
const customFileLocationEnv = `NODE_${binName.toUpperCase()}_BIN`
const verboseEnv = `NODE_${binName.toUpperCase()}_VERBOSE`

const defaultNativeExtensionsDirPath = path.join(__dirname, '..', 'native-extensions')
const customNativeExtensionsDirPath = process.env[customDirLocationEnv] || process.env[customGlobalDirLocationEnv]
const nativeExtensionsDirPath = customNativeExtensionsDirPath || defaultNativeExtensionsDirPath

const customNativeExtensionFilePath: string | undefined = process.env[customFileLocationEnv]

const verbose: boolean = !!yn(process.env[verboseEnv])

const defaultLinuxDirectory: ExtensionDir = {
  dirName: 'default',
  dist: 'ubuntu',
  version: '18.04'
}

const lock = Lock()

/**
 * #######################
 * ### utils functions ###
 * #######################
 */
const debuglog = (...msg: any[]): void => {
  if (!verbose) {
    return
  }
  const prefix = `[${packageName.toUpperCase()}]`
  // eslint-disable-next-line no-console
  console.log(prefix, ...msg)
}

const requireExtension = (os: string, distribution: string) => {
  const filePath = path.join(nativeExtensionsDirPath, os, distribution, binFileName)
  debuglog(`about to require file "${path.join('$basepath', os, distribution, binFileName)}"`)
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

const sanitizeLinuxDistribution = (os: getos.LinuxOs) => {
  return os.dist.toLowerCase().replace(/ |-|_|linux/g, '')
}

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

const acquireLock = (ressource: string): Promise<Mutex> => {
  return new Promise<Mutex>((resolve) => {
    lock(ressource, (releaser) => {
      resolve({ release: releaser() })
    })
  })
}

/**
 * ######################
 * ### main functions ###
 * ######################
 */
const initialize = async <T>(): Promise<T> => {
  debuglog('initializing...')

  if (customNativeExtensionFilePath) {
    debuglog(`using custom bin file path "${customNativeExtensionFilePath}"`)
    const binding = require(customNativeExtensionFilePath)
    debuglog('success')
    return binding
  }

  debuglog(`using base dir path "${nativeExtensionsDirPath}"`)

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
    const { dist: rawDistribution } = distro

    const sanitizedDist = sanitizeLinuxDistribution(distro)
    debuglog('sanitized linux distribution:', sanitizedDist)

    const relevantFolders: ExtensionDir[] = fs
      .readdirSync(path.join(nativeExtensionsDirPath, 'linux'))
      .map(parseDirName)
      .filter((x): x is ExtensionDir => !!x)
      .filter(({ dist }) => dist === sanitizedDist)
    relevantFolders.push(defaultLinuxDirectory)

    debuglog('relevant directories:', relevantFolders)

    for (const { dirName } of relevantFolders) {
      try {
        const binding = requireExtension('linux', dirName)
        debuglog('success')
        return binding
      } catch (err) {
        debuglog('error occured: ', err)
      }
    }

    throw new Error(`Linux distribution ${rawDistribution} is not supported by ${packageName}.`)
  }

  throw new Error(`The plateform ${distro.os} is not supported by ${packageName}.`)
}

let binding: any | undefined
export const getBinding = async <T>(): Promise<T> => {
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
