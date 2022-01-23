import _ from 'lodash'
import { Test, AssertionArgs } from 'src/typings'
import { assertModelsPrune, assertQueueTrainingFails, assertTrainingFails } from '../assertions'
import { grocery_dataset } from '../datasets'

const NAME = 'training-errors'

export const trainingErrorsTest: Test = {
  name: NAME,
  handler: async (args: AssertionArgs) => {
    const { logger } = args
    logger.info(`Running test: ${NAME}`)
    const trainingLogger = logger.sub(NAME)
    const trainingArgs = { ...args, logger: trainingLogger }

    const invalidDataset = _.cloneDeep(grocery_dataset)
    invalidDataset.intents[0].slots.push({ name: 'some-slot', entities: ['non-existent-entity'] })
    await assertQueueTrainingFails(trainingArgs, invalidDataset, 'dataset_format')

    await assertTrainingFails(trainingArgs, { ...grocery_dataset, language: 'ab' }, 'lang-server')
    await assertModelsPrune(args)
  }
}
