import ms from 'ms'
import {
  AssertionArgs,
  assertModelsInclude,
  assertModelsPrune,
  assertPredictionFails,
  assertQueueTrainingFails,
  assertTrainingCancels,
  assertTrainingFinishes,
  assertTrainingsAre,
  assertTrainingStarts
} from '../assertions'
import { clinc150_42_dataset, clinc150_666_dataset } from '../datasets'
import { sleep } from '../utils'

export const runModelLifecycleTest = async (args: AssertionArgs) => {
  const { logger } = args
  logger.info('Running model lifecycle test')
  const modelLifecycleLogger = logger.sub('model-lifecycle')
  const modelLifecycleArgs = { ...args, logger: modelLifecycleLogger }

  let clinc150_42_modelId = await assertTrainingStarts(modelLifecycleArgs, clinc150_42_dataset)

  await sleep(ms('1s'))
  await assertTrainingCancels(modelLifecycleArgs, clinc150_42_modelId)

  clinc150_42_modelId = await assertTrainingStarts(modelLifecycleArgs, clinc150_42_dataset)
  await assertTrainingFinishes(modelLifecycleArgs, clinc150_42_modelId)

  const clinc150_666_modelId = await assertTrainingStarts(modelLifecycleArgs, clinc150_666_dataset)

  await assertPredictionFails(modelLifecycleArgs, clinc150_666_modelId, 'I love Botpress', 'model_not_found')
  await assertModelsInclude(modelLifecycleArgs, [clinc150_42_modelId])
  await assertTrainingsAre(modelLifecycleArgs, ['done', 'training'])

  await sleep(ms('1s'))
  await assertTrainingCancels(modelLifecycleArgs, clinc150_666_modelId)

  await assertModelsPrune(args)
}
