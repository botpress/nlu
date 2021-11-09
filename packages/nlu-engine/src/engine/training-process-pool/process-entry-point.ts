import { makeProcessEntryPoint, TaskDefinition } from '@botpress/worker'
import { initializeTools } from '../initialize-tools'
import { Trainer, TrainInput, TrainOutput } from '../training-pipeline'
import { ErrorHandler } from './error-handler'

const main = async () => {
  const config = JSON.parse(process.env.NLU_CONFIG!)
  const processId = process.pid

  const taskEntry = makeProcessEntryPoint<TrainInput, TrainOutput>({ errorHandler: new ErrorHandler() })
  taskEntry.logger.info(`Training worker successfully started on process with pid ${processId}.`)

  const tools = await initializeTools(config, taskEntry.logger) // TODO: refactor worker lib so the initialization code is handled

  taskEntry.listenForTask(async (taskDef: TaskDefinition<TrainInput>) => {
    const { input, logger, progress } = taskDef

    tools.seededLodashProvider.setSeed(input.nluSeed)
    try {
      const output = await Trainer(input, { ...tools, logger }, progress)
      return output
    } finally {
      tools.seededLodashProvider.resetSeed()
    }
  })

  await taskEntry.initialize()
}
void main()
