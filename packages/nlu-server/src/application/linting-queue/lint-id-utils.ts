import * as NLUEngine from '@botpress/nlu-engine'
import { LintingId } from '../../infrastructure'

export class LintIdUtil {
  public static toString(id: LintingId): string {
    const { appId, modelId } = id
    const stringModelId = NLUEngine.modelIdService.toString(modelId)
    return `${appId}/${stringModelId}`
  }

  public static fromString(key: string): LintingId {
    const [appId, modelId] = key.split('/')
    return { appId, modelId: NLUEngine.modelIdService.fromString(modelId) }
  }

  public static areEqual(id1: LintingId, id2: LintingId): boolean {
    const { appId: appId1, modelId: modelId1 } = id1
    const { appId: appId2, modelId: modelId2 } = id2
    return appId1 === appId2 && NLUEngine.modelIdService.areSame(modelId1, modelId2)
  }
}
