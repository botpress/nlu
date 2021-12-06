import { makeProcessEntryPoint, TaskDefinition } from '@botpress/worker'
import { initializeTools } from '../initialize-tools'
import { trainingPipeline, TrainInput, TrainOutput } from '../training-pipeline'
import { ErrorHandler } from './error-handler'

export const ENTRY_POINT = __filename

const processEntryPoint = makeProcessEntryPoint<TrainInput, TrainOutput>({
  errorHandler: new ErrorHandler()
})

const main = async () => {
  const config = JSON.parse(process.env.NLU_CONFIG!)
  const processId = process.pid
  processEntryPoint.logger.info(`Training worker successfully started on process with pid ${processId}.`)

  try {
    const tools = await initializeTools(config, processEntryPoint.logger)

    processEntryPoint.listenForTask(async (taskDef: TaskDefinition<TrainInput>) => {
      const { input, logger, progress } = taskDef

      tools.seededLodashProvider.setSeed(input.nluSeed)
      try {
        const output = await trainingPipeline(input, { ...tools, logger }, progress)
        return output
      } finally {
        tools.seededLodashProvider.resetSeed()
      }
    })

    await processEntryPoint.initialize()
  } catch (thrown) {
    const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
    processEntryPoint.logger.error('An unhandled error occured in the process', err)
    process.exit(1)
  }
}

if (!processEntryPoint.isMainWorker()) {
  void main()
}
