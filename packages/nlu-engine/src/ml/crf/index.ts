import { Tagger as AddonTagger, Trainer as AddonTrainer, makeTrainer, makeTagger } from '@botpress/node-crfsuite'
import fse from 'fs-extra'
import { Logger } from 'src/typings'
import tmp from 'tmp'
import { MLToolkit } from '../../ml/typings'

export class Trainer implements MLToolkit.CRF.Trainer {
  private trainer!: AddonTrainer
  private _cancelTraining = false

  constructor(protected logger: Logger) {}

  public async initialize() {
    this.trainer = await makeTrainer({ debug: false })
  }

  public async train(
    elements: MLToolkit.CRF.DataPoint[],
    options: MLToolkit.CRF.TrainerOptions,
    progressCallback: (iteration: number) => void
  ): Promise<Buffer> {
    this.trainer.set_params(options)

    for (const { features, labels } of elements) {
      this.trainer.append(features, labels)
    }

    const crfModelFilename = tmp.fileSync({ postfix: '.bin' }).name

    this.trainer.train(crfModelFilename, (iteration) => {
      progressCallback && progressCallback(iteration)
      return this._cancelTraining ? 1 : 0
    })

    return fse.readFile(crfModelFilename)
  }

  public cancelTraining() {
    this._cancelTraining = true
  }
}

export class Tagger implements MLToolkit.CRF.Tagger {
  private tagger!: AddonTagger

  constructor() {}

  public async initialize() {
    this.tagger = await makeTagger()
  }

  public tag(xseq: string[][]): { probability: number; result: string[] } {
    return this.tagger.tag(xseq)
  }

  public open(crfModel: Buffer): boolean {
    const crfModelFn = tmp.tmpNameSync()
    fse.writeFileSync(crfModelFn, crfModel)
    return this.tagger.open(crfModelFn)
  }

  public marginal(xseq: string[][]): { [label: string]: number }[] {
    return this.tagger.marginal(xseq)
  }
}
