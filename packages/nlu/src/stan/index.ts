// eslint-disable-next-line import/order
import bytes from 'bytes'
import chalk from 'chalk'
import cluster from 'cluster'
import _ from 'lodash'
import path from 'path'
import * as NLUEngine from '../engine'
import { setupMasterNode, WORKER_TYPES } from '../utils/cluster'
import Logger, { centerText } from '../utils/logger'
import { copyDir } from '../utils/pkg-fs'
import { Logger as ILogger } from '../utils/typings'
import API from './api'
import { CommandLineOptions, mapCli, StanOptions } from './config'
import { displayDocumentation } from './documentation'

const readEnvJSONConfig = (): StanOptions | null => {
  const data = process.env.STAN_JSON_CONFIG
  if (!data) {
    return null
  }
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

const makeEngine = async (options: StanOptions, logger: ILogger) => {
  const loggerWrapper: NLUEngine.Logger = {
    debug: (msg: string) => logger.debug(msg),
    info: (msg: string) => logger.info(msg),
    warning: (msg: string, err?: Error) => (err ? logger.attachError(err).warn(msg) : logger.warn(msg)),
    error: (msg: string, err?: Error) => (err ? logger.attachError(err).error(msg) : logger.error(msg))
  }

  try {
    const { ducklingEnabled, ducklingURL, modelCacheSize, languageSources } = options
    const config: NLUEngine.Config = {
      languageSources,
      ducklingEnabled,
      ducklingURL,
      modelCacheSize,
      legacyElection: false
    }

    const engine = await NLUEngine.makeEngine(config, loggerWrapper)
    return engine
  } catch (err) {
    // TODO: Make lang provider throw if it can't connect.
    logger
      .attachError(err)
      .error(
        'There was an error while initializing Engine tools. Check out the connection to your language and Duckling server.'
      )
    process.exit(1)
  }
}

export default async function (cliOptions: CommandLineOptions) {
  const logger = Logger.sub('launcher')
  if (cluster.isMaster) {
    setupMasterNode(logger)
    return
  } else if (cluster.isWorker && process.env.WORKER_TYPE !== WORKER_TYPES.WEB) {
    return
  }

  const envConfig = readEnvJSONConfig()
  if (envConfig) {
    logger.info('Loading config from environment variables')
  }
  const options: StanOptions = envConfig ?? mapCli(cliOptions)

  for (const dir of ['./pre-trained', './stop-words']) {
    // TODO: no need for copy to APP_DATA_PATH, just use original files
    const srcPath = path.resolve(__dirname, '../../assets', dir)
    const destPath = path.resolve(process.APP_DATA_PATH, dir)
    await copyDir(srcPath, destPath)
  }

  if (!bytes(options.bodySize)) {
    throw new Error(`Specified body-size "${options.bodySize}" has an invalid format.`)
  }

  global.printLog = (args) => {
    const message = args[0]
    const rest = args.slice(1)

    logger.debug(message.trim(), rest)
  }

  logger.debug('NLU Server Options %o', options)

  const engine = await makeEngine(options, logger)
  const { nluVersion } = engine.getSpecifications()

  logger.info(chalk`========================================
      {bold ${centerText('Botpress Standalone NLU', 40, 9)}}
      {dim ${centerText(`Version ${nluVersion}`, 40, 9)}}
${_.repeat(' ', 9)}========================================`)

  if (options.authToken?.length) {
    logger.info(`authToken: ${chalk.greenBright('enabled')} (only users with this token can query your server)`)
  } else {
    logger.info(`authToken: ${chalk.redBright('disabled')} (anyone can query your nlu server)`)
  }

  if (options.limit) {
    logger.info(
      `limit: ${chalk.greenBright('enabled')} allowing ${options.limit} requests/IP address in a ${
        options.limitWindow
      } timeframe `
    )
  } else {
    logger.info(`limit: ${chalk.redBright('disabled')} (no protection - anyone can query without limitation)`)
  }

  if (options.ducklingEnabled) {
    logger.info(`duckling: ${chalk.greenBright('enabled')} url=${options.ducklingURL}`)
  } else {
    logger.info(`duckling: ${chalk.redBright('disabled')}`)
  }
  for (const langSource of options.languageSources) {
    logger.info(`lang server: url=${langSource.endpoint}`)
  }

  logger.info(`body size: allowing HTTP resquests body of size ${options.bodySize}`)

  if (options.dbURL) {
    logger.info(`models stored at "${options.dbURL}"`)
  } else {
    logger.info(`models stored at "${options.modelDir}"`)
  }

  if (options.batchSize > 0) {
    logger.info(`batch size: allowing up to ${options.batchSize} predictions in one call to POST /predict`)
  }

  options.doc && displayDocumentation(logger, options)

  await API(options, engine)
}
