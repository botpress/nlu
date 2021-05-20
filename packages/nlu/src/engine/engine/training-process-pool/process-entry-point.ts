import '../../../utils/worker-before'
import { serializeError } from '../../../utils/error-utils'
import { Logger as ILogger } from '../../typings'
import { initializeTools } from '../initialize-tools'
import { Trainer } from '../training-pipeline'
import { Tools } from '../typings'
import { AllOutgoingMessages, IncomingMessage, isStartTraining } from './communication'

const config = JSON.parse(process.env.NLU_CONFIG!)
const requestId = process.env.REQUEST_ID!
const processId = process.pid

const loggerWrapper: ILogger = {
  debug: (msg: string) => {
    const response: IncomingMessage<'log'> = {
      type: 'log',
      payload: { log: { debug: msg }, requestId },
      srcPID: processId
    }
    process.send!(response)
  },
  info: (msg: string) => {
    const response: IncomingMessage<'log'> = {
      type: 'log',
      payload: { log: { info: msg }, requestId },
      srcPID: processId
    }
    process.send!(response)
  },
  warning: (msg: string, err?: Error) => {
    const warning = `${msg} ${serializeError(err)}`
    const response: IncomingMessage<'log'> = {
      type: 'log',
      payload: { log: { warning }, requestId },
      srcPID: processId
    }
    process.send!(response)
  },
  error: (msg: string, err?: Error) => {
    const error = `${msg} ${serializeError(err)}`
    const response: IncomingMessage<'log'> = { type: 'log', payload: { log: { error }, requestId }, srcPID: processId }
    process.send!(response)
  }
}
loggerWrapper.info(`Training worker successfully started on process with pid ${processId}.`)

const msgHandler = (tools: Tools) => async (msg: AllOutgoingMessages) => {
  if (isStartTraining(msg)) {
    const { input } = msg.payload

    const progressCb = (progress: number) => {
      const res: IncomingMessage<'training_progress'> = {
        type: 'training_progress',
        payload: { progress },
        srcPID: processId
      }
      process.send!(res)
    }

    tools.seededLodashProvider.setSeed(input.nluSeed)

    try {
      const output = await Trainer(input, { ...tools, logger: loggerWrapper }, progressCb)
      // TODO: send multiple packet when output is to big
      const res: IncomingMessage<'training_done'> = { type: 'training_done', payload: { output }, srcPID: processId }
      process.send!(res)
    } catch (err) {
      const res: IncomingMessage<'training_error'> = {
        type: 'training_error',
        payload: { error: serializeError(err) },
        srcPID: processId
      }
      process.send!(res)
    } finally {
      tools.seededLodashProvider.resetSeed()
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
initializeTools(config, loggerWrapper)
  .then((tools) => {
    process.on('message', msgHandler(tools))
    const res: IncomingMessage<'worker_ready'> = { type: 'worker_ready', payload: { requestId }, srcPID: processId }
    process.send!(res)
  })
  .catch((err) => {
    loggerWrapper.error('The following error occured during initialization of tools', err)
  })
