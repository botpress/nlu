import fs from 'fs'
import getos from 'getos'
import path from 'path'
import { Classifier, Query } from './typings'

type ClassifierCtor = new (modelFilename?: string) => Classifier
type QueryCtor = new (modelFilename: string) => Query

interface BindingType {
  Classifier: ClassifierCtor
  Query: QueryCtor
}

const nativeExtensionsPath = path.join(__dirname, '..', 'native-extensions')
const fileName = 'fasttext.node'
const packageName = 'node-fasttext'

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

export const makeClassifier = async (modelFilename?: string) => {
  if (binding) {
    return new binding.Classifier(modelFilename)
  }
  binding = await init()
  return new binding.Classifier(modelFilename)
}

export const makeQuery = async (modelFilename: string) => {
  if (binding) {
    return new binding.Query(modelFilename)
  }
  binding = await init()
  return new binding.Query(modelFilename)
}
