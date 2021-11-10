import fs from 'fs'
import getos from 'getos'
import path from 'path'
import { Processor } from './typings'

type TaggerCtor = new () => Processor

interface BindingType {
  Processor: TaggerCtor
}

const defaultNativeExtensionsPath = path.join(__dirname, '..', 'native-extensions')
const envNativeExtensionsPath =
  process.env?.NATIVE_EXTENSIONS_DIR &&
  fs.existsSync(process.env.NATIVE_EXTENSIONS_DIR) &&
  process.env.NATIVE_EXTENSIONS_DIR

const nativeExtensionsPath = envNativeExtensionsPath || defaultNativeExtensionsPath
const fileName = 'sentencepiece.node'
const packageName = 'node-sentencepiece'

function requireExtension(os: string, distribution: string) {
  const filePath = path.join(nativeExtensionsPath, os, distribution, fileName)
  return require(filePath)
}

async function getOS(): Promise<getos.Os> {
  return new Promise((resolve, reject) => {
    getos((err, distro) => {
      if (err) {
        reject(err)
      }
      resolve(distro)
    })
  })
}

const init = async (): Promise<BindingType> => {
  const distro = await getOS()

  if (distro.os === 'win32') {
    return requireExtension('windows', 'all')
  }
  if (distro.os === 'darwin') {
    return requireExtension('darwin', 'all')
  }

  if (distro.os === 'linux') {
    const distribution = distro.dist.toLowerCase()

    const relevantFolders = fs
      .readdirSync(path.join(nativeExtensionsPath, 'linux'))
      .filter((dir) => dir.startsWith(distribution))
      .sort()
      .reverse()
    relevantFolders.push('default')

    for (const dir of relevantFolders) {
      try {
        const nsvm = requireExtension('linux', dir) // this might throw
        return nsvm
      } catch (err) {}
    }

    throw new Error(`Linux distribution ${distribution} is not supported by ${packageName}.`)
  }

  throw new Error(`The plateform ${distro.os} is not supported by ${packageName}.`)
}

let binding: BindingType | undefined
export const makeProcessor = async () => {
  if (binding) {
    return new binding.Processor()
  }
  binding = await init()
  return new binding.Processor()
}
