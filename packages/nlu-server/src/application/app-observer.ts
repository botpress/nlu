import { ModelId } from '@botpress/nlu-engine'
import { EventEmitter2 } from 'eventemitter2'
import { Training } from '../infrastructure/training-repo/typings'

export type TrainingUpdateData = Training
export type TrainingUpdateListener = (eventData: TrainingUpdateData) => Promise<void>

export type ModelLoadedData = { appId: string; modelId: ModelId; readTime: number; loadTime: number; totalTime: number }
export type ModelLoadedListener = (eventData: ModelLoadedData) => Promise<void>

export type ApplicationEvent = 'training_update' | 'model_loaded'

export type ApplicationEventHandler<E extends ApplicationEvent> = E extends 'training_update'
  ? TrainingUpdateListener
  : ModelLoadedListener

export type ApplicationEventData<E extends ApplicationEvent> = E extends 'training_update'
  ? TrainingUpdateData
  : ModelLoadedData

export class ApplicationObserver {
  protected evEmitter = new EventEmitter2()

  public on<E extends ApplicationEvent>(event: E, handler: ApplicationEventHandler<E>): void {
    this.evEmitter.on(event, handler)
  }

  public once<E extends ApplicationEvent>(event: E, handler: ApplicationEventHandler<E>): void {
    this.evEmitter.once(event, handler)
  }

  public off<E extends ApplicationEvent>(event: E, handler: ApplicationEventHandler<E>): void {
    this.evEmitter.off(event, handler)
  }

  public emit<E extends ApplicationEvent>(event: E, data: ApplicationEventData<E>): void {
    this.evEmitter.emit(event, data)
  }
}
