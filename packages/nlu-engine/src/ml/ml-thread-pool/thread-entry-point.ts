import { makeThreadEntryPoint, TaskDefinition } from '@botpress/worker'
import { CRFTagger } from '../crf/base'
import { SVMClassifier } from '../svm/base'
import { TaskInput, TaskOutput } from './typings'

export const ENTRY_POINT = __filename

const threadEntryPoint = makeThreadEntryPoint<TaskInput, TaskOutput>()

const main = async () => {
  try {
    threadEntryPoint.listenForTask(async (taskDef: TaskDefinition<TaskInput>) => {
      const { input, progress } = taskDef

      if (input.trainingType === 'svm') {
        const svm = new SVMClassifier(taskDef.logger)
        const result = await svm.train(input, progress)
        const bin = SVMClassifier.modelType.encode(result)
        return Buffer.from(bin)
      }

      const crf = new CRFTagger(taskDef.logger)
      const result = await crf.train({ elements: input.points, options: input.options }, progress)
      const bin = CRFTagger.modelType.encode(result)
      return Buffer.from(bin)
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
