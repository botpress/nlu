import fs from 'fs'
import getos from 'getos'
import path from 'path'
import { Tagger, Trainer, TrainerOptions } from './typings'

type TaggerCtor = new () => Tagger
type TrainerCtor = new (opt?: TrainerOptions) => Trainer

interface BindingType {
  Tagger: TaggerCtor
  Trainer: TrainerCtor
}

const nativeExtensionsPath = path.join(__dirname, '..', 'native-extensions')
const fileName = 'crfsuite.node'
const packageName = 'node-crfsuite'

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
export const makeTrainer = async (args?: TrainerOptions) => {
  if (binding) {
    return new binding.Trainer(args)
  }
  binding = await init()
  return new binding.Trainer(args)
}

export const makeTagger = async () => {
  if (binding) {
    return new binding.Tagger()
  }
  binding = await init()
  return new binding.Tagger()
}
