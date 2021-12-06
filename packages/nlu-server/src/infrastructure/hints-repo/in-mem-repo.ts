import { Logger } from '@botpress/logger'
import * as NLUEngine from '@botpress/nlu-engine'
import { DatasetIssue, IssueCode } from '@botpress/nlu-engine/src/hints'
import Bluebird from 'bluebird'
import fse from 'fs-extra'
import _ from 'lodash'
import path from 'path'
import { HintsRepository } from '.'

export class InMemoryHintRepo implements HintsRepository {
  private _logger: Logger

  constructor(logger: Logger) {
    this._logger = logger.sub('hints-repo')
  }

  public async getHints(appId: string, modelId: NLUEngine.ModelId): Promise<DatasetIssue<IssueCode>[]> {
    throw new Error('Method not implemented.')
  }

  public async appendHints(appId: string, hints: DatasetIssue<IssueCode>[]): Promise<void | void[]> {
    throw new Error('Method not implemented.')
  }

  public async initialize() {
    this._logger.debug('Hints repo initializing...')
  }

  public async teardown() {
    this._logger.debug('Hints repo teardown...')
  }
}
