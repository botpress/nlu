import { Model } from '@botpress/nlu-engine'
import * as ptb from '@botpress/ptb-schema'
import _ from 'lodash'

const PTBModelId = new ptb.PTBMessage('ModelId', {
  specificationHash: { type: 'string', id: 1 },
  contentHash: { type: 'string', id: 2 },
  seed: { type: 'int32', id: 3 },
  languageCode: { type: 'string', id: 4 }
})

const PTBModel = new ptb.PTBMessage('Model', {
  id: { type: PTBModelId, id: 1 },
  startedAt: { type: 'string', id: 2 },
  finishedAt: { type: 'string', id: 3 },
  data: { type: 'bytes', id: 4 }
})

export const compressModel = async (model: Model): Promise<Buffer> => {
  const { id, startedAt, finishedAt, data } = model
  const serialized = PTBModel.encode({
    id,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    data
  })
  return Buffer.from(serialized)
}

export const decompressModel = async (buffer: Buffer): Promise<Model> => {
  const { id, finishedAt, startedAt, data } = PTBModel.decode(buffer)
  return { id, finishedAt: new Date(finishedAt), startedAt: new Date(startedAt), data: Buffer.from(data) }
}
