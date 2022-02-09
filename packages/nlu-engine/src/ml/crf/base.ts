import { Tagger as AddonTagger, makeTrainer, makeTagger } from '@botpress/node-crfsuite'
import fse from 'fs-extra'
import { Logger } from 'src/typings'
import tmp from 'tmp'
import { DataPoint, TrainerOptions, ITagger } from './typings'

export class Trainer {
  public static async train(
    elements: DataPoint[],
    options: TrainerOptions,
    logger: Logger,
    progressCallback: (iteration: number) => void
  ): Promise<Buffer> {
    const trainer = await makeTrainer({ debug: false })
    trainer.set_params(options)

    for (const { features, labels } of elements) {
      trainer.append(features, labels)
    }

    const crfModelFilename = tmp.fileSync({ postfix: '.bin' }).name

    trainer.train(crfModelFilename, (iteration) => {
      progressCallback && progressCallback(iteration)
      return 0 // return 1 to stop training
    })

    return fse.readFile(crfModelFilename)
  }
}

export class Tagger implements ITagger {
  private tagger!: AddonTagger

  public static async create(crfModel: Buffer): Promise<ITagger> {
    const instance = new Tagger()
    instance.tagger = await makeTagger()

    const crfModelFn = tmp.tmpNameSync()
    fse.writeFileSync(crfModelFn, crfModel)
    const success = instance.tagger.open(crfModelFn)

    if (!success) {
      throw new Error('CRF Tagger could not open model.')
    }

    return instance
  }

  public tag(xseq: string[][]): { probability: number; result: string[] } {
    return this.tagger.tag(xseq)
  }

  public marginal(xseq: string[][]): { [label: string]: number }[] {
    return this.tagger.marginal(xseq)
  }
}
