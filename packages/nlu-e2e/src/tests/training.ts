import _ from 'lodash'
import { AssertionArgs, assertModelsPrune, assertQueueTrainingFails, assertTrainingFails } from '../assertions'
import { grocery_dataset } from '../datasets'

export const runTrainingTest = async (args: AssertionArgs) => {
  const { logger } = args
  logger.info('Running training test')
  const trainingLogger = logger.sub('training')
  const trainingArgs = { ...args, logger: trainingLogger }

  const invalidDataset = _.cloneDeep(grocery_dataset)
  invalidDataset.intents[0].slots.push({ name: 'some-slot', entities: ['non-existent-entity'] })
  await assertQueueTrainingFails(trainingArgs, invalidDataset, 'dataset_format')

  await assertTrainingFails(trainingArgs, { ...grocery_dataset, language: 'ab' }, 'lang-server')
  await assertModelsPrune(args)
}
