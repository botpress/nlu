import _ from 'lodash'
import { extractPattern } from '../../tools/patterns-utils'
import { EntityExtractionResult, ListEntityModel, PatternEntity, WarmedListEntityModel } from '../../typings'
import Utterance from '../../utterance/utterance'
import { extractForListModel } from './list-extraction'

interface SplittedModels {
  withCacheHit: WarmedListEntityModel[]
  withCacheMiss: WarmedListEntityModel[]
}

export class CustomEntityExtractor {
  public extractListEntities(utterance: Utterance, list_entities: ListEntityModel[]): EntityExtractionResult[] {
    return _(list_entities)
      .map((model) => extractForListModel(utterance, model))
      .flatten()
      .value()
  }

  public extractPatternEntities = (
    utterance: Utterance,
    pattern_entities: PatternEntity[]
  ): EntityExtractionResult[] => {
    const input = utterance.toString()
    // taken from pattern_extractor
    return _.flatMap(pattern_entities, (ent) => {
      const regex = new RegExp(ent.pattern!, ent.matchCase ? '' : 'i')

      return extractPattern(input, regex, []).map((res) => ({
        confidence: 1,
        start: Math.max(0, res.sourceIndex),
        end: Math.min(input.length, res.sourceIndex + res.value.length),
        value: res.value,
        metadata: {
          extractor: 'pattern',
          source: res.value,
          entityId: `custom.pattern.${ent.name}`
        },
        sensitive: ent.sensitive,
        type: ent.name
      }))
    })
  }

  public async extractMultipleListEntities(
    utterances: Utterance[],
    list_entities: WarmedListEntityModel[],
    progress: (p: number) => void
  ): Promise<EntityExtractionResult[][]> {
    let idx = 0
    return utterances.map((u) => {
      const res = this._extractMultipleListEntities(u, list_entities)
      progress(idx++ / utterances.length)
      return res
    })
  }

  public async extractMultiplePatternEntities(
    utterances: Utterance[],
    pattern_entities: PatternEntity[],
    progress: (p: number) => void
  ): Promise<EntityExtractionResult[][]> {
    let idx = 0
    return utterances.map((u) => {
      const res = this.extractPatternEntities(u, pattern_entities)
      progress(idx++ / utterances.length)
      return res
    })
  }

  private _extractMultipleListEntities(utterance: Utterance, list_entities: WarmedListEntityModel[]) {
    // no need to "keep-value" of entities as this function's purpose is precisly to extract entities before tagging them in the utterance.
    const cacheKey = utterance.toString({ lowerCase: true })
    const { withCacheHit, withCacheMiss } = this._splitModelsByCacheHitOrMiss(list_entities, cacheKey)

    const cachedMatches: EntityExtractionResult[] = _.flatMap(
      withCacheHit,
      (listModel) => listModel.cache.get(cacheKey)!
    )

    const extractedMatches: EntityExtractionResult[] = _(withCacheMiss)
      .map((model) => {
        const extractions = extractForListModel(utterance, model)
        model.cache.set(cacheKey, extractions)
        return extractions
      })
      .flatten()
      .value()

    return [...cachedMatches, ...extractedMatches]
  }

  private _splitModelsByCacheHitOrMiss(listModels: WarmedListEntityModel[], cacheKey: string): SplittedModels {
    return listModels.reduce(
      ({ withCacheHit, withCacheMiss }, nextModel) => {
        if (nextModel.cache.has(cacheKey)) {
          withCacheHit.push(nextModel)
        } else {
          withCacheMiss.push(nextModel)
        }
        return { withCacheHit, withCacheMiss }
      },
      { withCacheHit: [], withCacheMiss: [] } as SplittedModels
    )
  }
}
