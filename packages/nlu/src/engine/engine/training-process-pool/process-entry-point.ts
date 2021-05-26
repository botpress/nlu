import '../../../utils/worker-before'
import { makeProcessEntryPoint, TaskDefinition } from '@botpress/worker'
import { initializeTools } from '../initialize-tools'
import { Trainer, TrainInput, TrainOutput } from '../training-pipeline'

const main = async () => {
  const config = JSON.parse(process.env.NLU_CONFIG!)
  const processId = process.pid

  const taskEntry = makeProcessEntryPoint<TrainInput, TrainOutput>()
  taskEntry.logger.info(`Training worker successfully started on process with pid ${processId}.`)

  const tools = await initializeTools(config, taskEntry.logger)

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
