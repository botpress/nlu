import { AssertionArgs, Test } from 'src/typings'
import {
  assertIntentPredictionWorks,
  assertModelsInclude,
  assertModelsPrune,
  assertTrainingFinishes,
  assertTrainingStarts
} from '../assertions'
import { grocery_dataset, grocery_test_sample } from '../datasets'

const NAME = 'prediction'

export const predictionTest: Test = {
  name: NAME,
  handler: async (args: AssertionArgs) => {
    const { logger } = args
    logger.info(`Running test: ${NAME}`)
    const predictionLogger = logger.sub(NAME)
    const predictionArgs = { ...args, logger: predictionLogger }

    const grocery_modelId = await assertTrainingStarts(predictionArgs, grocery_dataset)
    await assertTrainingFinishes(predictionArgs, grocery_modelId)

    await assertModelsInclude(predictionArgs, [grocery_modelId])

    await assertIntentPredictionWorks(
      predictionArgs,
      grocery_modelId,
      grocery_test_sample.utterance,
      grocery_test_sample.intent
    )

    await assertModelsPrune(predictionArgs)
  }
}
