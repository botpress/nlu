import { makeThreadPool, ThreadPool } from '@botpress/worker'
import Bluebird from 'bluebird'
import _ from 'lodash'
import os from 'os'
import { Logger } from 'src/typings'
import { EntityExtractionResult, ListEntityModel, WarmedListEntityModel } from '../../typings'
import Utterance from '../../utterance/utterance'
import { CustomEntityExtractor } from '.'
import { SerializableUtteranceToken, serializeUtteranceToken } from './serializable-token'
import { ENTRY_POINT } from './thread-entry-point'

const maxMLThreads = Math.max(os.cpus().length - 1, 1) // ncpus - webworker
const userMlThread = process.env.BP_NUM_ML_THREADS ? Number(process.env.BP_NUM_ML_THREADS) : 4
const numMLThreads = Math.min(maxMLThreads, userMlThread)

interface TaskUnitInput {
  utt_idx: number
  entity_idx: number
  utterance: Utterance
  list_entity: WarmedListEntityModel
}

interface SerializableTaskUnitInput {
  utt_idx: number
  entity_idx: number
  tokens: SerializableUtteranceToken[]
  list_entity: ListEntityModel
}

interface TaskUnitOutput {
  utt_idx: number
  entity_idx: number
  entities: EntityExtractionResult[]
}

export interface TaskInput {
  units: SerializableTaskUnitInput[]
}

export interface TaskOutput {
  units: TaskUnitOutput[]
}

let threadPool!: ThreadPool<TaskInput, TaskOutput>

export class MultiThreadCustomEntityExtractor extends CustomEntityExtractor {
  constructor(logger: Logger) {
    super()

    if (!threadPool) {
      threadPool = makeThreadPool<TaskInput, TaskOutput>(logger, {
        entryPoint: ENTRY_POINT,
        env: { ...process.env },
        maxWorkers: numMLThreads
      })
    }
  }

  public async extractMultipleListEntities(
    utterances: Utterance[],
    list_entities: WarmedListEntityModel[],
    progress: (p: number) => void
  ) {
    const allTaskUnits = this._getAllTaskUnits(utterances, list_entities)
    const [cacheHit, cacheMiss] = this._splitUnitsByCacheHitOrMiss(allTaskUnits)

    const cacheHitResults = cacheHit.map((unit) => {
      const { entity_idx, utt_idx, list_entity, utterance } = unit
      const cacheKey = this._getCacheKey(utterance)
      return {
        entity_idx,
        utt_idx,
        entities: list_entity.cache.get(cacheKey)!
      }
    })

    const cacheMissResults = await this._launchOnThreads(cacheMiss, progress)
    this._updateCache(utterances, list_entities, cacheMissResults)
    return this._mapOutputs(utterances, [...cacheHitResults, ...cacheMissResults])
  }

  private async _launchOnThreads(units: TaskUnitInput[], progress: (p: number) => void) {
    const unitsPerWorker = Math.ceil(units.length / numMLThreads)
    const chunks = _(units).map(this.serializeUnit).chunk(unitsPerWorker).value()

    const progressPerWorker: _.Dictionary<number> = {}
    let idx = 0
    const threadOutputs = await Bluebird.map(chunks, (chunk) => {
      idx++
      const taskId = `${idx++}`
      return threadPool.run(taskId, { units: chunk }, (p: number) => {
        progressPerWorker[taskId] = p
        const totalProgress = _(progressPerWorker).values().sum()
        progress(totalProgress / chunks.length)
      })
    })

    return _.flatMap(threadOutputs, (u) => u.units)
  }

  private serializeUnit(unit: TaskUnitInput): SerializableTaskUnitInput {
    const { entity_idx, utt_idx, utterance, list_entity: warmedModel } = unit
    const { cache, ...coldModel } = warmedModel
    const { tokens } = utterance
    return { entity_idx, utt_idx, tokens: tokens.map(serializeUtteranceToken), list_entity: coldModel }
  }

  private _splitUnitsByCacheHitOrMiss(units: TaskUnitInput[]): [TaskUnitInput[], TaskUnitInput[]] {
    const cacheHit: TaskUnitInput[] = []
    const cacheMiss: TaskUnitInput[] = []
    for (const unit of units) {
      const { utterance, list_entity } = unit
      const cacheKey = this._getCacheKey(utterance)
      if (list_entity.cache.has(cacheKey)) {
        cacheHit.push(unit)
      } else {
        cacheMiss.push(unit)
      }
    }
    return [cacheHit, cacheMiss]
  }

  private _getAllTaskUnits(utterances: Utterance[], list_entities: WarmedListEntityModel[]): TaskUnitInput[] {
    const allTaskUnits: TaskUnitInput[] = []
    for (let i = 0; i < utterances.length; i++) {
      for (let j = 0; j < list_entities.length; j++) {
        allTaskUnits.push({
          utt_idx: i,
          entity_idx: j,
          utterance: utterances[i],
          list_entity: list_entities[j]
        })
      }
    }
    return allTaskUnits
  }

  private _updateCache(
    utterances: Utterance[],
    list_entities: WarmedListEntityModel[],
    outputs: TaskUnitOutput[]
  ): void {
    for (const out of outputs) {
      const { entity_idx, utt_idx, entities } = out
      const utterance = utterances[utt_idx]
      const cacheKey = this._getCacheKey(utterance)
      list_entities[entity_idx].cache.set(cacheKey, entities)
    }
  }

  private _mapOutputs(utterances: Utterance[], outputs: TaskUnitOutput[]): EntityExtractionResult[][] {
    const entitiesPerIdx = _(outputs)
      .groupBy((o) => o.utt_idx)
      .mapValues((ox) => _.flatMap(ox, (o) => o.entities))
      .value()

    return _.range(utterances.length).map((idx) => {
      const entities = entitiesPerIdx[idx]
      if (entities) {
        return entities
      }
      return []
    })
  }

  private _getCacheKey(utterance: Utterance) {
    return utterance.toString({ lowerCase: true })
  }
}
