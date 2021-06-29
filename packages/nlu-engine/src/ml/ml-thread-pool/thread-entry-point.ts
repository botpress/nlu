import { makeThreadEntryPoint, TaskDefinition } from '@botpress/worker'
import { Trainer as CrfTrainer } from '../crf'
import { Trainer as SvmTrainer } from '../svm'
import { TaskInput, TaskOutput } from './typings'

const main = async () => {
  const taskEntry = makeThreadEntryPoint<TaskInput, TaskOutput>()

  taskEntry.listenForTask(async (taskDef: TaskDefinition<TaskInput>) => {
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
  await taskEntry.initialize()
}
void main()
