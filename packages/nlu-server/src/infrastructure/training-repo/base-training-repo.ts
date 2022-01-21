import { Logger } from '@botpress/logger'
import _ from 'lodash'
import { Training, TrainingListener, TrainingRepository, TrainingId } from './typings'

export abstract class BaseTrainingRepository implements TrainingRepository {
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
