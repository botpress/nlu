import fs from 'fs'
import _ from 'lodash'
import path from 'path'
import { AssertionArgs, Test } from 'src/typings'
import {
  assertIntentPredictionWorks,
  assertModelsInclude,
  assertModelsPrune,
  assertModelTransferIsEnabled,
  assertModelWeightsDownload,
  assertModelWeightsDownloadFails,
  assertModelWeightsUpload,
  assertModelWeightsUploadFails,
  assertPredictionFails,
  assertTrainingFinishes,
  assertTrainingStarts
} from '../assertions'
import { grocery_dataset, grocery_test_sample } from '../datasets'
import { bufferReplace, corruptBuffer, getE2ECachePath } from '../utils'

const NAME = 'modelweights-transfer'

export const modelWeightsTransferTest: Test = {
  name: NAME,
  handler: async (args: AssertionArgs) => {
    const { logger } = args
    logger.info(`Running test: ${NAME}`)
    const modelWeightsTransferLogger = logger.sub(NAME)
    const modelWeightsTransferArgs = { ...args, logger: modelWeightsTransferLogger }

    await assertModelTransferIsEnabled(modelWeightsTransferArgs)

    const modelId = await assertTrainingStarts(modelWeightsTransferArgs, grocery_dataset)

    // ensure model download fails if model is not created yet
    await assertModelWeightsDownloadFails(modelWeightsTransferArgs, modelId, 'MODEL_NOT_FOUND')

    // ensure model works
    await assertTrainingFinishes(modelWeightsTransferArgs, modelId)
    await assertModelsInclude(modelWeightsTransferArgs, [modelId])
    await assertIntentPredictionWorks(
      modelWeightsTransferArgs,
      modelId,
      grocery_test_sample.utterance,
      grocery_test_sample.intent
    )

    // download model locally
    const cachePath = getE2ECachePath(modelWeightsTransferArgs.appId)
    const fileLocation = path.join(cachePath, `${modelId}.model`)
    await assertModelWeightsDownload(modelWeightsTransferArgs, modelId, fileLocation)

    // prune model remotly and ensure prediction does not work
    await assertModelsPrune(modelWeightsTransferArgs)
    await assertPredictionFails(modelWeightsTransferArgs, modelId, grocery_test_sample.utterance, 'model_not_found')

    // upload model and ensure prediction works again
    await assertModelWeightsUpload(modelWeightsTransferArgs, fileLocation)
    await assertModelsInclude(modelWeightsTransferArgs, [modelId])
    await assertIntentPredictionWorks(
      modelWeightsTransferArgs,
      modelId,
      grocery_test_sample.utterance,
      grocery_test_sample.intent
    )

    // ensure uploading a corrupted buffer fails
    const originalModelWeights = await fs.promises.readFile(fileLocation)
    const corruptedWeights = corruptBuffer(originalModelWeights)
    const corruptedFileLocation = path.join(cachePath, `${modelId}.corrupted.model`)
    await fs.promises.writeFile(corruptedFileLocation, corruptedWeights)
    await assertModelWeightsUploadFails(modelWeightsTransferArgs, corruptedFileLocation, 'INVALID_MODEL_FORMAT')

    // ensure uploading a older version buffer fails
    const specHash = modelId.split('.')[1]
    const dummySpecHash = 'ffffff9999999999'
    const deprecatedWeights = bufferReplace(
      originalModelWeights,
      Buffer.from(specHash, 'utf8'),
      Buffer.from(dummySpecHash, 'utf8')
    )
    const deprecatedFileLocation = path.join(cachePath, `${modelId}.deprecated.model`)
    await fs.promises.writeFile(deprecatedFileLocation, deprecatedWeights)
    await assertModelWeightsUploadFails(modelWeightsTransferArgs, deprecatedFileLocation, 'UNSUPORTED_MODEL_SPEC')

    // cleanup
    await assertModelsPrune(modelWeightsTransferArgs)
  }
}
