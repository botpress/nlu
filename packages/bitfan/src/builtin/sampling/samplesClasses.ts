import * as sdk from 'bitfan/sdk'
import _ from 'lodash'
import SeededLodashProvider from '../../services/seeded-lodash'
import { isOOS } from '../labels'

const DEFAULT_OPTIONS = {
  keepOOS: true
}

export const sampleClasses: typeof sdk.sampling.sampleClasses = <T extends sdk.SingleLabel>(
  datasets: sdk.DataSet<T>[],
  nClass: number,
  seed: number,
  opt?: Partial<{ keepOOS: boolean }>
) => {
  const options = { ...DEFAULT_OPTIONS, ...(opt ?? {}) }

  const allClasses = _(datasets)
    .flatMap((d) => d.samples)
    .map((s) => s.label)
    .uniq()
    .filter((l) => !isOOS(l))
    .value()

  if (nClass < 0) {
    throw new Error(`Can't subsample a negative ammount of classes (${nClass}).`)
  }
  if (nClass > allClasses.length) {
    throw new Error(`Can't subsample ${nClass} classes out of ${allClasses.length} class.`)
  }

  const seededLodashProvider = new SeededLodashProvider()
  seededLodashProvider.setSeed(seed)
  const lo = seededLodashProvider.getSeededLodash()
  const chosenClasses = lo.sampleSize(allClasses, nClass)
  seededLodashProvider.resetSeed()

  const keepSample = (s: sdk.Sample<T>) => {
    return (options.keepOOS && isOOS(s.label)) || chosenClasses.includes(s.label)
  }

  return datasets.map(({ name, type, lang, samples }) => {
    return <sdk.DataSet<T>>{
      name,
      type,
      lang,
      samples: samples.filter(keepSample)
    }
  })
}
