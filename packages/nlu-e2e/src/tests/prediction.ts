import {
  assertIntentPredictionWorks,
  AssertionArgs,
  assertModelsInclude,
  assertModelsPrune,
  assertTrainingFinishes,
  assertTrainingStarts
} from '../assertions'
import { grocery_dataset } from '../datasets'

export const runPredictionTest = async (args: AssertionArgs) => {
  const { logger } = args
  logger.info('Running prediction test')
  const predictionLogger = logger.sub('prediction')
  const predictionArgs = { ...args, logger: predictionLogger }

  const grocery_modelId = await assertTrainingStarts(predictionArgs, grocery_dataset)
  await assertTrainingFinishes(predictionArgs, grocery_modelId)

  await assertModelsInclude(predictionArgs, [grocery_modelId])

  await assertIntentPredictionWorks(predictionArgs, grocery_modelId, 'these grapes look moldy!', 'fruit-is-moldy')

  await assertModelsPrune(predictionArgs)
}
