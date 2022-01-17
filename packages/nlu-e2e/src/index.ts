import { makeLogger } from '@botpress/logger'
import { Client as NLUClient, http, TrainingState, TrainingStatus, TrainInput } from '@botpress/nlu-client'
import chai from 'chai'
import chalk from 'chalk'
import cliProgress from 'cli-progress'

import _ from 'lodash'
import ms from 'ms'
import { nanoid } from 'nanoid'
import semver from 'semver'
import yargs from 'yargs'
import { clinc150_42_dataset, clinc150_666_dataset, grocery_dataset } from './datasets'
import { UnsuccessfullAPICall } from './errors'
import { pollTrainingUntil } from './utils/poll-training'
import { sleep } from './utils/sleep'

type CommandLineArgs = {
  nluEndpoint: string
}

const APP_ID = nanoid()
const REQUIRED_LANG = ['en']
const logger = makeLogger().sub('e2e')

const assertServerIsReachable = async (client: NLUClient) => {
  logger.info('assert server is reachable')

  const infoRes = await client.getInfo()
  if (!infoRes.success) {
    throw new UnsuccessfullAPICall(infoRes.error, 'Make sure the NLU Server is reachable.')
  }

  const { info } = infoRes
  chai.expect(info.version).to.satisfy(semver.valid)
  chai
    .expect(info.languages)
    .to.be.a('array')
    .and.to.include.any.members(REQUIRED_LANG, 'Test requires nlu server to have some expected languages')
}

const assertModels = async (client: NLUClient, expectedModels: string[]) => {
  logger.info(`assert models are: [${expectedModels.join(', ')}]`)

  const modelRes = await client.listModels(APP_ID)
  if (!modelRes.success) {
    throw new UnsuccessfullAPICall(modelRes.error)
  }

  const { models } = modelRes
  chai.expect(models).to.include.members(expectedModels)
}

const assertTrainingStarts = async (client: NLUClient, trainSet: TrainInput): Promise<string> => {
  logger.info('assert training starts')

  const contexts = _(trainSet.intents)
    .flatMap((i) => i.contexts)
    .uniq()
    .value()

  const trainRes = await client.startTraining(APP_ID, { ...trainSet, contexts })
  if (!trainRes.success) {
    throw new UnsuccessfullAPICall(trainRes.error)
  }

  const { modelId } = trainRes
  chai.expect(modelId).to.be.a('string').and.not.to.be.empty

  const ts = await pollTrainingUntil({
    nluClient: client,
    modelId,
    appId: APP_ID,
    maxTime: ms('5s'),
    condition: (ts: TrainingState) => ts.status !== 'training-pending'
  })

  chai.expect(ts.status).to.equal(<TrainingStatus>'training')
  chai.expect(ts.error).to.be.undefined

  return modelId
}

const assertTrainingCancels = async (client: NLUClient, modelId: string): Promise<void> => {
  logger.info('assert training cancels')

  const cancelRes = await client.cancelTraining(APP_ID, modelId)
  if (!cancelRes.success) {
    throw new UnsuccessfullAPICall(cancelRes.error)
  }

  const ts = await pollTrainingUntil({
    nluClient: client,
    modelId,
    appId: APP_ID,
    maxTime: ms('5s'),
    condition: (ts: TrainingState) => ts.status !== 'training'
  })

  chai.expect(ts.status).to.equal(<TrainingStatus>'canceled')
  chai.expect(ts.error).to.be.undefined
}

const assertTrainingFinishes = async (client: NLUClient, modelId: string): Promise<void> => {
  logger.info('asserts training finishes')

  const trainProgressBar = new cliProgress.Bar({
    format: 'Training: [{bar}] ({percentage}%), {duration}s',
    stream: process.stdout,
    noTTYOutput: true
  })
  trainProgressBar.start(100, 0)

  const updateProgress = (p: number) => {
    if (p === 1) {
      p = 0.99
    }
    trainProgressBar.update(p * 100)
  }

  try {
    const ts = await pollTrainingUntil({
      nluClient: client,
      modelId,
      appId: APP_ID,
      maxTime: -1,
      condition: (ts: TrainingState) => {
        updateProgress(ts.progress)
        return ts.status !== 'training'
      }
    })
    trainProgressBar.update(100)

    chai.expect(ts.status).to.equal(<TrainingStatus>'done')
    chai.expect(ts.error).to.be.undefined
  } finally {
    trainProgressBar.stop()
  }
}

const assertTrainings = async (client: NLUClient, expectedTrainings: TrainingStatus[]) => {
  logger.info(`assert trainings are: [${expectedTrainings.join(', ')}]`)

  const lsTrainingRes = await client.listTrainings(APP_ID)
  if (!lsTrainingRes.success) {
    throw new UnsuccessfullAPICall(lsTrainingRes.error)
  }
  const { trainings } = lsTrainingRes
  const trainStatuses = trainings.map((ts) => ts.status)
  chai.expect(trainStatuses).to.include.members(expectedTrainings)
}

const assertPredictionFails = async (
  client: NLUClient,
  modelId: string,
  utterance: string,
  expectedError: http.ErrorType
) => {
  logger.info('assert prediction fails')

  const predictRes = await client.predict(APP_ID, modelId, { utterances: [utterance] })
  if (predictRes.success) {
    throw new Error(`Expected Prediction to fail with error: "${expectedError}"`)
  }
  const { error } = predictRes
  chai.expect(error.type).to.equal(expectedError)
}

const assertLanguageDetectionWorks = async (client: NLUClient, utterance: string, expectedLang: string) => {
  logger.info('assert language detection works')

  const detectLangRes = await client.detectLanguage(APP_ID, { utterances: [utterance], models: [] })
  if (!detectLangRes.success) {
    throw new UnsuccessfullAPICall(detectLangRes.error)
  }
  const { detectedLanguages } = detectLangRes
  chai.expect(detectedLanguages).to.have.length(1)
  chai.expect(detectedLanguages[0]).to.equal(expectedLang)
}

const assertIntentPredictionWorks = async (
  client: NLUClient,
  modelId: string,
  utterance: string,
  expectedIntent: string
) => {
  logger.info('assert intent prediction works')

  const predictRes = await client.predict(APP_ID, modelId, { utterances: [utterance] })
  if (!predictRes.success) {
    throw new UnsuccessfullAPICall(predictRes.error)
  }
  const { predictions } = predictRes
  chai.expect(predictions).to.have.length(1)

  chai.expect(predictions[0].contexts).to.have.length.greaterThanOrEqual(1)
  const mostConfidentCtx = _.maxBy(predictions[0].contexts, (c) => c.confidence)

  const mostConfidentIntent = _.maxBy(mostConfidentCtx?.intents, (i) => i.confidence)
  chai.expect(mostConfidentIntent?.name).to.equals(expectedIntent)
}

const assertModelsPrune = async (client: NLUClient) => {
  logger.info('assert models can be pruned')

  const pruneRes = await client.pruneModels(APP_ID)
  if (!pruneRes.success) {
    throw new UnsuccessfullAPICall(pruneRes.error)
  }

  const modelRes = await client.listModels(APP_ID)
  if (!modelRes.success) {
    throw new UnsuccessfullAPICall(modelRes.error)
  }

  const { models } = modelRes
  chai.expect(models).to.have.length(0)
}

const main = async (args: CommandLineArgs) => {
  const { nluEndpoint } = args
  const client = new NLUClient({
    baseURL: nluEndpoint
  })

  await assertServerIsReachable(client)
  await assertModels(client, [])

  let clinc150_42_modelId = await assertTrainingStarts(client, clinc150_42_dataset)

  await sleep(ms('1s'))
  await assertTrainingCancels(client, clinc150_42_modelId)

  clinc150_42_modelId = await assertTrainingStarts(client, clinc150_42_dataset)
  await assertTrainingFinishes(client, clinc150_42_modelId)

  const clinc150_666_modelId = await assertTrainingStarts(client, clinc150_666_dataset)

  await assertPredictionFails(client, clinc150_666_modelId, 'I love Botpress', 'model_not_found')
  await assertModels(client, [clinc150_42_modelId])
  await assertTrainings(client, ['done', 'training'])

  await sleep(ms('1s'))
  await assertTrainingCancels(client, clinc150_666_modelId)

  const grocery_modelId = await assertTrainingStarts(client, grocery_dataset)
  await assertTrainingFinishes(client, grocery_modelId)

  await assertModels(client, [grocery_modelId]) // clinc150_42_modelId might have been erased after training

  await assertLanguageDetectionWorks(client, 'I love Botpress', 'en')
  await assertLanguageDetectionWorks(client, "J'aime Botpress de tout mon coeur", 'fr')

  await assertIntentPredictionWorks(client, grocery_modelId, 'these grapes look moldy!', 'fruit-is-moldy')

  await assertModelsPrune(client)
}

yargs
  .command(
    ['test', '$0'],
    'Launch e2e tests on nlu-server',
    {
      nluEndpoint: {
        type: 'string',
        required: true
      }
    },
    (argv) => {
      void main(argv)
        .then(() => {})
        .catch((err) => {
          console.error(chalk.red('Test failed for the following reason:\n'), err)
          process.exit(1)
        })
    }
  )
  .help().argv
