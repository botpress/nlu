import { makeThreadEntryPoint, TaskDefinition } from '@botpress/worker'
import { Trainer as CrfTrainer } from '../crf/base'
import { Trainer as SvmTrainer } from '../svm/base'
import { TaskInput, TaskOutput } from './typings'

export const ENTRY_POINT = __filename

const threadEntryPoint = makeThreadEntryPoint<TaskInput, TaskOutput>()

const main = async () => {
  try {
    threadEntryPoint.listenForTask(async (taskDef: TaskDefinition<TaskInput>) => {
      const { input, progress } = taskDef

      if (input.trainingType === 'svm') {
        const result = await SvmTrainer.train(input.points, input.options, taskDef.logger, progress)
        return result
      }

      const result = await CrfTrainer.train(input.points, input.options, taskDef.logger, progress)
      return result
    })
    await threadEntryPoint.initialize()
  } catch (thrown) {
    const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
    threadEntryPoint.logger.error('An unhandled error occured in the thread', err)
    process.exit(1)
  }
}

if (!threadEntryPoint.isMainWorker()) {
  void main()
}
