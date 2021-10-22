import {
  LanguageInfo,
  TokenizeResult,
  VectorizeResult,
  LanguageState,
  DownloadStartResult
} from '@botpress/lang-client'
import { LanguageService } from '@botpress/nlu-engine'
import Bluebird from 'bluebird'
import { OfflineError } from '../api/errors'
import { getLanguageByCode } from '../languages'
import DownloadManager from './download-manager'

interface AppOptions {
  version: string
  adminToken?: string
  offline: boolean
}

export class LangApplication {
  constructor(
    public languageService: LanguageService,
    public downloadManager: DownloadManager,
    private options: AppOptions
  ) {}

  public initialize(): Promise<void> {
    return Bluebird.all([this.languageService.initialize(), this.downloadManager.initialize()]) as Promise<void>
  }

  public getInfo(authHeader?: string): LanguageInfo {
    return {
      version: this.options.version,
      ready: this.languageService.isReady,
      dimentions: this.languageService.dim,
      domain: this.languageService.domain,
      readOnly: !this._isAdminToken(authHeader)
    }
  }

  public async tokenize(utterances: string[], language: string): Promise<TokenizeResult> {
    const tokens = await this.languageService.tokenize(utterances, language)
    return { utterances, language, tokens }
  }

  public async vectorize(tokens: string[], language: string): Promise<VectorizeResult> {
    const result = await this.languageService.vectorize(tokens, language)
    return { language, vectors: result }
  }

  public getLanguages(): LanguageState {
    if (this.options.offline) {
      const localLanguages = this.languageService.getModels().map((m) => {
        const { name } = getLanguageByCode(m.lang)
        return { ...m, code: m.lang, name }
      })

      return {
        available: localLanguages,
        installed: localLanguages,
        downloading: []
      }
    }

    const downloading = this.downloadManager.inProgress.map((x) => ({
      lang: x.lang,
      progress: {
        status: x.getStatus(),
        downloadId: x.id,
        size: x.totalDownloadSizeProgress
      }
    }))

    return {
      available: this.downloadManager.downloadableLanguages,
      installed: this.languageService.getModels(),
      downloading
    }
  }

  public async startDownloadLang(lang: string): Promise<DownloadStartResult> {
    if (this.options.offline) {
      throw new OfflineError()
    }

    const downloadId = await this.downloadManager.download(lang)
    return { downloadId }
  }

  public deleteLang(lang: string): void {
    return this.languageService.remove(lang)
  }

  public loadLang(lang: string): Promise<void> {
    return this.languageService.loadModel(lang)
  }

  public cancelDownloadLang(downloadId: string): void {
    if (this.options.offline) {
      throw new OfflineError()
    }
    return this.downloadManager.cancelAndRemove(downloadId)
  }

  private _isAdminToken = (authHeader?: string) => {
    if (!this.options.adminToken || !this.options.adminToken.length) {
      return true
    }
    if (!authHeader) {
      return false
    }
    const [, token] = authHeader.split(' ')
    return token === this.options.adminToken
  }
}
