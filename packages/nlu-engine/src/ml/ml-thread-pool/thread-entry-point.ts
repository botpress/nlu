import { makeThreadEntryPoint, TaskDefinition } from '@botpress/worker'
import { Trainer as CrfTrainer } from '../crf'
import { Trainer as SvmTrainer } from '../svm'
import { TaskInput, TaskOutput } from './typings'

export const ENTRY_POINT = __filename

const threadEntryPoint = makeThreadEntryPoint<TaskInput, TaskOutput>()

const main = async () => {
  try {
    threadEntryPoint.listenForTask(async (taskDef: TaskDefinition<TaskInput>) => {
      const { input, progress } = taskDef

      if (input.trainingType === 'svm') {
        const trainer = new SvmTrainer(taskDef.logger)
        const result = await trainer.train(input.points, input.options, progress)
        return result
      }

      const trainer = new CrfTrainer(taskDef.logger)
      await trainer.initialize()
      const result = await trainer.train(input.points, input.options, progress)
      return result
    })
    await threadEntryPoint.initialize()
  } catch (err) {
    threadEntryPoint.logger.error('An unhandled error occured in the thread', err)
    process.exit(1)
  }
}

if (!threadEntryPoint.isMainWorker()) {
  void main()
}
