import ms from 'ms'
import { AssertionArgs, Test } from 'src/typings'
import {
  assertModelsInclude,
  assertModelsPrune,
  assertPredictionFails,
  assertQueueTrainingFails,
  assertTrainingCancels,
  assertTrainingFinishes,
  assertTrainingsAre,
  assertTrainingStarts
} from '../assertions'
import { clinc50_42_dataset, clinc50_666_dataset } from '../datasets'
import { sleep } from '../utils'

const NAME = 'life-cycle'

export const runModelLifecycleTest: Test = {
  name: NAME,
  handler: async (args: AssertionArgs) => {
    const { logger } = args
    logger.info(`Running test: ${NAME}`)
    const modelLifecycleLogger = logger.sub('model-lifecycle')
    const modelLifecycleArgs = { ...args, logger: modelLifecycleLogger }

    let clinc150_42_modelId = await assertTrainingStarts(modelLifecycleArgs, clinc50_42_dataset)

    await sleep(ms('1s'))
    await assertTrainingCancels(modelLifecycleArgs, clinc150_42_modelId)

    clinc150_42_modelId = await assertTrainingStarts(modelLifecycleArgs, clinc50_42_dataset)
    await assertTrainingFinishes(modelLifecycleArgs, clinc150_42_modelId)

    const clinc150_666_modelId = await assertTrainingStarts(modelLifecycleArgs, clinc50_666_dataset)

    await assertQueueTrainingFails(modelLifecycleArgs, clinc50_666_dataset, 'training_already_started')
    await assertPredictionFails(modelLifecycleArgs, clinc150_666_modelId, 'I love Botpress', 'model_not_found')
    await assertModelsInclude(modelLifecycleArgs, [clinc150_42_modelId])
    await assertTrainingsAre(modelLifecycleArgs, ['done', 'training'])

    await sleep(ms('1s'))
    await assertTrainingCancels(modelLifecycleArgs, clinc150_666_modelId)

    await assertModelsPrune(args)
  }
}
