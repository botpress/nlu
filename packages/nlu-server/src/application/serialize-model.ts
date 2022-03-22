import { Model } from '@botpress/nlu-engine'
import * as ptb from '@botpress/ptb-schema'
import _ from 'lodash'

const PTBModelId = new ptb.PTBMessage('ModelId', {
  specificationHash: { type: 'string', id: 1, rule: 'required' },
  contentHash: { type: 'string', id: 2, rule: 'required' },
  seed: { type: 'int32', id: 3, rule: 'required' },
  languageCode: { type: 'string', id: 4, rule: 'required' }
})

const PTBModel = new ptb.PTBMessage('Model', {
  id: { type: PTBModelId, id: 1, rule: 'required' },
  startedAt: { type: 'string', id: 2, rule: 'required' },
  finishedAt: { type: 'string', id: 3, rule: 'required' },
  data: { type: 'bytes', id: 4, rule: 'required' }
})

export const serializeModel = async (model: Model): Promise<Buffer> => {
  const { id, startedAt, finishedAt, data } = model
  const serialized = PTBModel.encode({
    id,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    data
  })
  return Buffer.from(serialized)
}

export const deserializeModel = async (buffer: Buffer): Promise<Model> => {
  const { id, finishedAt, startedAt, data } = PTBModel.decode(buffer)
  return { id, finishedAt: new Date(finishedAt), startedAt: new Date(startedAt), data: Buffer.from(data) }
}
