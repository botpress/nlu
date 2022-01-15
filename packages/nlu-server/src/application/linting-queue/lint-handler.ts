import { queues } from '@botpress/distributed'
import { Logger } from '@botpress/logger'
import { TrainInput } from '@botpress/nlu-client'
import * as NLUEngine from '@botpress/nlu-engine'
import { ModelRepository } from '../../infrastructure'
import { LintTaskData, LintTaskError } from './typings'

export class LintHandler implements queues.TaskRunner<TrainInput, LintTaskData, LintTaskError> {
  constructor(private engine: NLUEngine.Engine, private modelRepo: ModelRepository, private logger: Logger) {}

  public run = async (
    task: queues.Task<TrainInput, LintTaskData, LintTaskError>,
    progressCb: queues.ProgressCb
  ): Promise<queues.TerminatedTask<TrainInput, LintTaskData, LintTaskError>> => {
    return { ...task, status: 'done' }
  }

  public async cancel(task: queues.Task<TrainInput, LintTaskData, LintTaskError>): Promise<void> {}
}
