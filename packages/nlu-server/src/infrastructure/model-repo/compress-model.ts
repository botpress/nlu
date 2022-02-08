import { Model } from '@botpress/nlu-engine'
import * as ptb from '@botpress/ptb-schema'
import fse, { WriteStream } from 'fs-extra'
import _ from 'lodash'
import path from 'path'
import { Stream } from 'stream'
import tar from 'tar'
import tmp from 'tmp'

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

  // TODO replace that logic with in-memory streams
  const tmpDir = tmp.dirSync({ unsafeCleanup: true })
  const tmpFileName = 'model'
  const tmpFilePath = path.join(tmpDir.name, tmpFileName)
  await fse.writeFile(tmpFilePath, Buffer.from(serialized))
  const archiveName = 'archive'
  const archivePath = path.join(tmpDir.name, archiveName)
  await tar.create(
    {
      file: archivePath,
      cwd: tmpDir.name,
      portable: true,
      gzip: true
    },
    [tmpFileName]
  )
  const buffer = await fse.readFile(archivePath)
  tmpDir.removeCallback()
  return buffer
}

export const decompressModel = async (buffer: Buffer): Promise<Model> => {
  const buffStream = new Stream.PassThrough()
  buffStream.end(buffer)
  const tmpDir = tmp.dirSync({ unsafeCleanup: true })

  const tarFileName = 'model'
  const tarStream = tar.x({ cwd: tmpDir.name, strict: true }, [tarFileName]) as WriteStream
  buffStream.pipe(tarStream)
  await new Promise((resolve) => tarStream.on('close', resolve))

  const modelBuff = await fse.readFile(path.join(tmpDir.name, tarFileName))
  try {
    const { id, finishedAt, startedAt, data } = PTBModel.decode(modelBuff)
    return { id, finishedAt: new Date(finishedAt), startedAt: new Date(startedAt), data: Buffer.from(data) }
  } finally {
    tmpDir.removeCallback()
  }
}
