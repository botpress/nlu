import { Logger } from '@botpress/nlu-logger'
import axios, { CancelTokenSource } from 'axios'
import Bluebird from 'bluebird'
import fse from 'fs-extra'
import _ from 'lodash'
import { Readable } from 'stream'
type ModelType = 'bpe' | 'embeddings'

export interface DownloadableModel {
  type: ModelType
  remoteUrl: string
  language: string
  size: number
  dim?: number
  domain?: string
}

export type DownloadStatus = 'pending' | 'downloading' | 'loading' | 'errored' | 'done'

export type ProgressListener = (p: number) => void
export type DoneListener = (id: string) => void
export default class ModelDownload {
  public readonly id: string = Date.now().toString()
  public readonly lang: string

  public totalDownloadSizeProgress: number = 0
  private _doneListeners: DoneListener[] = []
  private _progressListeners: ProgressListener[] = []
  private status: DownloadStatus = 'pending'
  private message: string = ''
  private readonly cancelToken: CancelTokenSource = axios.CancelToken.source()

  private currentModel = 0

  constructor(private models: DownloadableModel[], public readonly destDir: string, private _dowloadLogger: Logger) {
    this.lang = models[0].language
  }

  private getFilePath(model: DownloadableModel): string {
    let fn = ''
    if (model.type === 'bpe') {
      fn = `bp.${model.language}.bpe.model`
    } else if (model.type === 'embeddings') {
      fn = `${model.domain}.${model.language}.${model.dim}.bin`
    }

    return `${this.destDir}/${fn}`
  }

  async start(done: DoneListener) {
    this._doneListeners.push(done)

    if (this.status !== 'pending') {
      throw new Error("Can't restart download")
    }

    if (this.currentModel < this.models.length) {
      this.status = 'downloading'
      await this._downloadNext()
    }
  }

  async listenProgress(listener: (p: number) => void) {
    this._progressListeners.push(listener)
  }

  async listenCompletion(listener: DoneListener) {
    this._doneListeners.push(listener)
  }

  private async _downloadNext() {
    const modelToDownload = this.models[this.currentModel] as DownloadableModel

    this._dowloadLogger.debug(`Started to download ${modelToDownload.language} ${modelToDownload.type} model`)

    const { data, headers } = await axios.get(modelToDownload.remoteUrl, {
      responseType: 'stream',
      cancelToken: this.cancelToken.token
    })

    const filePath = this.getFilePath(modelToDownload)
    const tmpPath = filePath + '.tmp'
    const stream = data as Readable
    const fileSize = parseInt(headers['content-length'])
    let downloadedSize = 0

    stream.pipe(fse.createWriteStream(tmpPath))
    stream.on('error', (err) => {
      this._dowloadLogger.error('model download failed', { lang: modelToDownload.language, error: err.message })
      this.status = 'errored'
      this.message = 'Error: ' + err.message
    })

    stream.on('data', (chunk) => {
      downloadedSize += chunk.length
      this.totalDownloadSizeProgress += chunk.length

      const progress =
        this.totalDownloadSizeProgress /
        _(this.models)
          .map((m) => m.size)
          .sum()
      this._progressListeners.forEach((l) => l(progress))
    })
    stream.on('end', () => this._onFinishedDownloading(modelToDownload, downloadedSize, fileSize))
  }

  async _onFinishedDownloading(downloadedModel: DownloadableModel, downloadSize: number, fileSize: number) {
    this.currentModel++

    if (downloadSize !== fileSize) {
      // Download is incomplete
      this.status = 'errored'
      this.message = 'Download incomplete or file is corrupted'
      this.currentModel = this.models.length
      return this._cleanupTmp(downloadedModel)
    }

    try {
      await this._makeModelAvailable(downloadedModel)
    } catch (err) {
      this.status = 'errored'
      this.message = 'Download incomplete or file is corrupted'
      this.currentModel = this.models.length
      return this._cleanupTmp(downloadedModel)
    }

    if (this.currentModel < this.models.length) {
      await this._downloadNext()
    } else {
      this.status = 'done'
      this.message = ''
      this._doneListeners.forEach((l) => l(this.id))
    }
  }

  private _cleanupTmp(model: DownloadableModel) {
    const tmpPath = `${this.getFilePath(model)}.tmp`
    if (fse.existsSync(tmpPath)) {
      fse.unlinkSync(tmpPath)
    }

    this._dowloadLogger.debug('deleting model %o', { path: tmpPath, type: model.type, lang: model.language })
  }

  private async _makeModelAvailable(model: DownloadableModel) {
    const filePath = this.getFilePath(model) as string
    const tmpPath = `${filePath}.tmp`
    if (fse.existsSync(filePath)) {
      this._dowloadLogger.debug('removing existing model at %s', filePath)
      fse.unlinkSync(filePath)
    }

    try {
      await Bluebird.fromCallback((cb) => fse.rename(tmpPath, filePath, cb))
    } catch (err) {
      this._dowloadLogger.debug('could not rename downloaded file %s', filePath)
      await Bluebird.fromCallback((cb) => fse.move(tmpPath, filePath, cb))
    }
  }

  cancel() {
    if (this.status === 'downloading') {
      this.cancelToken.cancel()
      this.status = 'errored'
      this.message = 'Cancelled'
    }
  }

  public getStatus(): { status: DownloadStatus; message: string } {
    return { status: this.status, message: this.message }
  }
}
