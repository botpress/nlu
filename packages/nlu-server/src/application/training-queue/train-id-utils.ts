import * as NLUEngine from '@botpress/nlu-engine'
import { TrainingId } from '../../infrastructure'

export class TrainIdUtil {
  public static toString(id: TrainingId) {
    const { appId, modelId } = id
    const stringModelId = NLUEngine.modelIdService.toString(modelId)
    return `${appId}/${stringModelId}`
  }

  public static fromString(key: string): TrainingId {
    const [appId, modelId] = key.split('/')
    return { appId, modelId: NLUEngine.modelIdService.fromString(modelId) }
  }

  public static areEqual(id1: TrainingId, id2: TrainingId): boolean {
    const { appId: appId1, modelId: modelId1 } = id1
    const { appId: appId2, modelId: modelId2 } = id2
    return appId1 === appId2 && NLUEngine.modelIdService.areSame(modelId1, modelId2)
  }
}
