import { Tagger as AddonTagger, makeTrainer, makeTagger } from '@botpress/node-crfsuite'
import fse from 'fs-extra'
import { PipelineComponent } from 'src/component'
import { Logger } from 'src/typings'
import tmp from 'tmp'
import { MarginalPrediction, TagPrediction } from '.'
import { CRFTrainInput } from './typings'

export class CRFTagger implements PipelineComponent<CRFTrainInput, string[][], TagPrediction> {
  private static _displayName = 'SVM Classifier'
  private static _name = 'svm-classifier'

  private tagger: AddonTagger | undefined

  public get name() {
    return CRFTagger._name
  }

  constructor(protected logger: Logger) {}

  public async train(input: CRFTrainInput, progressCallback: (iteration: number) => void): Promise<Buffer> {
    const { options, elements } = input
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

  public async load(crfModel: Buffer): Promise<void> {
    const tagger = await makeTagger()
    const crfModelFn = tmp.tmpNameSync()
    fse.writeFileSync(crfModelFn, crfModel)
    const success = tagger.open(crfModelFn)

    if (!success) {
      throw new Error('CRF Tagger could not open model.')
    }

    this.tagger = tagger
  }

  public async predict(xseq: string[][]): Promise<TagPrediction> {
    if (!this.tagger) {
      throw new Error(`${CRFTagger._displayName} must load model before calling predict.`)
    }
    return this.tagger.tag(xseq)
  }

  public async marginal(xseq: string[][]): Promise<MarginalPrediction[]> {
    if (!this.tagger) {
      throw new Error(`${CRFTagger._displayName} must load model before calling marginal.`)
    }
    return this.tagger.marginal(xseq)
  }
}
