import fs from 'fs'
import getos from 'getos'
import path from 'path'
import { NSVM } from './typings'

type SvmCtor = new (args?: { random_seed: number }) => NSVM
type HelloWorld = () => string
interface BindingType {
  NSVM: SvmCtor
  hello: HelloWorld
}

const nativeExtensionsPath = path.join(__dirname, '..', 'native-extensions')
const fileName = 'node-svm.node'

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
      .filter(dir => dir.startsWith(distribution))
      .sort()
      .reverse()
    relevantFolders.push('default')

    for (const dir of relevantFolders) {
      try {
        const nsvm = requireExtension('linux', dir) // this might throw
        return nsvm
      } catch (err) {}
    }

    throw new Error(`Linux distribution ${distribution} is not supported by node-svm.`)
  }

  throw new Error(`The plateform ${distro.os} is not supported by node-svm.`)
}

let binding: BindingType | undefined
export const makeSvm = async (args?: { random_seed: number }) => {
  if (binding) {
    return new binding.NSVM(args)
  }
  binding = await init()
  return new binding.NSVM(args)
}
