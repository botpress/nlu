import { LoggerLevel, Logger } from '@botpress/logger'
import { LanguageService } from '@botpress/nlu-engine'
import cliProgress from 'cli-progress'
import fse from 'fs-extra'
import _ from 'lodash'

import DownloadManager from './application/download-manager'
import { getDownloadConfig } from './config'
import * as types from './typings'

export const download: typeof types.download = async (argv: types.DownloadArgv) => {
  const options = getDownloadConfig(argv)
  const baseLogger = new Logger('', {
    level: LoggerLevel.Info,
    filters: undefined
  })

  const languageDirectory = options.langDir
  await fse.ensureDir(languageDirectory)

  const launcherLogger = baseLogger.sub('Launcher')

  const langService = new LanguageService(options.dim, options.domain, languageDirectory)
  const downloadManager = new DownloadManager(
    options.dim,
    options.domain,
    languageDirectory,
    options.metadataLocation,
    baseLogger
  )

  await langService.initialize()
  await downloadManager.initialize()

  const alreadyInstalledModels = langService.getModels().filter((m) => m.lang === options.lang)
  if (alreadyInstalledModels.length) {
    launcherLogger.info(`Model ${options.lang}.${options.dim} is already installed.`)
    downloadManager.teardown()
    return
  }
  launcherLogger.info(`About to download model ${options.lang}.${options.dim}.`)

  const progressBar = new cliProgress.Bar({
    format: 'Download: [{bar}] ({percentage}%), {duration}s',
    stream: process.stdout,
    noTTYOutput: true
  })
  progressBar.start(100, 0)

  const progressCb = (p: number) => {
    if (p >= 1) {
      p = 0.99
    }
    progressBar.update(p * 100)
  }

  const downloadId = await downloadManager.download(options.lang)

  return new Promise<void>((resolve) => {
    const handleKill = () => {
      downloadManager.cancelAndRemove(downloadId)
      progressBar.stop()
      launcherLogger.error('download canceled!')
      resolve()
    }
    process.on('SIGINT', handleKill)

    const downloading = downloadManager.inProgress.find((m) => m.id === downloadId)
    downloading?.listenProgress(progressCb)

    downloading?.listenCompletion(async (id) => {
      progressBar.update(100)
      progressBar.stop()

      const allFiles = await fse.readdir(languageDirectory)
      const availableModels = allFiles.filter((f) => !f.startsWith('.'))
      launcherLogger.info('Available Models:')
      for (const m of availableModels) {
        launcherLogger.info(`- ${m}`)
      }

      process.off('SIGINT', handleKill)
      downloadManager.teardown()
      resolve()
    })
  })
}
