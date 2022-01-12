import { Logger } from '@botpress/logger'
import _ from 'lodash'
import {
  Training,
  TrainingListener,
  WrittableTrainingRepository,
  TrainingRepository,
  TrainingId,
  TrainingTrx
} from './typings'

export abstract class BaseWritableTrainingRepo implements WrittableTrainingRepository {
  private _listeners: TrainingListener[] = []

  constructor(protected _logger: Logger) {}

  protected _onTrainingEvent(training: Training) {
    this._listeners.forEach((listener) => {
      // The await keyword isn't used to prevent a listener from blocking the training repo
      listener(training).catch((e) =>
        this._logger.attachError(e).error('an error occured in the training repository listener')
      )
    })
  }

  public addListener(listener: TrainingListener) {
    this._listeners.push(listener)
  }

  public removeListener(listenerToRemove: TrainingListener) {
    _.remove(this._listeners, (listener) => listener === listenerToRemove)
  }

  public async set(training: Training): Promise<void> {
    this._onTrainingEvent(training)
  }

  abstract initialize(): Promise<void>
  abstract teardown(): Promise<void>
  abstract get(id: TrainingId): Promise<Training | undefined>
  abstract has(id: TrainingId): Promise<boolean>
  abstract query(query: Partial<Training>): Promise<Training[]>
  abstract queryOlderThan(query: Partial<Training>, threshold: Date): Promise<Training[]>
  abstract delete(id: TrainingId): Promise<void>
}

export abstract class BaseTrainingRepository<writtable extends WrittableTrainingRepository>
  implements TrainingRepository {
  constructor(protected _logger: Logger, protected _writtableTrainingRepository: writtable) {}

  public addListener(listener: TrainingListener) {
    this._writtableTrainingRepository.addListener(listener)
  }

  public removeListener(listener: TrainingListener) {
    this._writtableTrainingRepository.removeListener(listener)
  }

  abstract initialize(): Promise<void>
  abstract teardown(): Promise<void>
  abstract get(id: TrainingId): Promise<Training | undefined>
  abstract has(id: TrainingId): Promise<boolean>
  abstract query(query: Partial<Training>): Promise<Training[]>
  abstract queryOlderThan(query: Partial<Training>, threshold: Date): Promise<Training[]>
  abstract delete(id: TrainingId): Promise<void>
  abstract inTransaction(trx: TrainingTrx, name: string): Promise<void>
}
