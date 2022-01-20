import { makeProcessEntryPoint, TaskDefinition } from '@botpress/worker'
import { DatasetIssue, IssueCode } from '../../linting'
import { initializeTools } from '../initialize-tools'
import { lintingPipeline } from '../linting/linting-pipeline'
import { ErrorHandler } from '../training-process-pool/error-handler'
import { LintingInput, LintingOuput, LintingProgress } from './typings'

export const ENTRY_POINT = __filename

const processEntryPoint = makeProcessEntryPoint<LintingInput, LintingOuput, LintingProgress>({
  errorHandler: new ErrorHandler()
})

const main = async () => {
  const config = JSON.parse(process.env.NLU_CONFIG!)
  const processId = process.pid
  processEntryPoint.logger.info(`Linting worker successfully started on process with pid ${processId}.`)

  try {
    const tools = await initializeTools(config, processEntryPoint.logger)

    processEntryPoint.listenForTask(async (taskDef: TaskDefinition<LintingInput, LintingOuput, LintingProgress>) => {
      const { input, progress } = taskDef

      tools.seededLodashProvider.setSeed(input.trainSet.seed)
      try {
        const progressCallback = (current: number, total: number, issues: DatasetIssue<IssueCode>[]) => {
          const p = current / total
          progress(p, {
            total,
            current,
            issues
          })
        }

        const issues = await lintingPipeline(input.trainSet, tools, {
          minSpeed: input.minSpeed,
          progressCallback
        })
        return { issues }
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
