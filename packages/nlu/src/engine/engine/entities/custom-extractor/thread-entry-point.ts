import { makeThreadEntryPoint, TaskDefinition } from '@botpress/worker'
import { extractForListModel } from './list-extraction'
import { TaskInput, TaskOutput } from './multi-thread-extractor'

const main = async () => {
  const threadEntryPoint = makeThreadEntryPoint<TaskInput, TaskOutput>()

  threadEntryPoint.listenForTask(async (taskDef: TaskDefinition<TaskInput>) => {
    const { input, progress } = taskDef
    let i = 0
    const N = input.units.length
    const units = input.units.map((u) => {
      const { utt_idx, entity_idx, list_entity, tokens } = u
      const entities = extractForListModel(tokens, list_entity)
      progress(i++ / N)
      return { utt_idx, entity_idx, entities }
    })
    return { units }
  })

  await threadEntryPoint.initialize()
}
void main()
