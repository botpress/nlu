import {
  DatasetIssue,
  http,
  IssueCode,
  IssueComputationSpeed,
  LintingState,
  LintingStatus,
  TrainingErrorType,
  TrainingState,
  TrainingStatus,
  TrainInput
} from '@botpress/nlu-client'
import chai from 'chai'
import cliProgress from 'cli-progress'
import _ from 'lodash'
import ms from 'ms'
import semver from 'semver'
import { UnsuccessfullAPICall } from './errors'
import { AssertionArgs } from './typings'
import { pollLintingUntil, pollTrainingUntil } from './utils'

export const assertServerIsReachable = async (args: AssertionArgs, requiredLanguages: string[]) => {
  const { client, logger, appId } = args
  logger.debug('assert server is reachable')

  const infoRes = await client.getInfo()
  if (!infoRes.success) {
    throw new UnsuccessfullAPICall(infoRes.error, 'Make sure the NLU Server is reachable.')
  }

  const { info } = infoRes
  chai.expect(info.version).to.satisfy(semver.valid)
  chai
    .expect(info.languages)
    .to.be.a('array')
    .and.to.include.any.members(requiredLanguages, 'Test requires nlu server to have some expected languages')
}

export const assertModelsInclude = async (args: AssertionArgs, expectedModels: string[]) => {
  const { client, logger, appId } = args
  logger.debug(`assert models include: [${expectedModels.join(', ')}]`)

  const modelRes = await client.listModels(appId)
  if (!modelRes.success) {
    throw new UnsuccessfullAPICall(modelRes.error)
  }

  const { models } = modelRes
  chai.expect(models).to.include.members(expectedModels)
}

export const assertModelsAreEmpty = async (args: AssertionArgs) => {
  const { client, logger, appId } = args
  logger.debug('assert models are empty')

  const modelRes = await client.listModels(appId)
  if (!modelRes.success) {
    throw new UnsuccessfullAPICall(modelRes.error)
  }

  const { models } = modelRes
  chai.expect(models).to.have.length(0)
}

const _getContexts = (trainSet: TrainInput): string[] =>
  _(trainSet.intents)
    .flatMap((i) => i.contexts)
    .uniq()
    .value()

export const assertTrainingStarts = async (args: AssertionArgs, trainSet: TrainInput): Promise<string> => {
  const { client, logger, appId } = args
  logger.debug('assert training starts')

  const contexts = _getContexts(trainSet)
  const trainRes = await client.startTraining(appId, { ...trainSet, contexts })
  if (!trainRes.success) {
    throw new UnsuccessfullAPICall(trainRes.error)
  }

  const { modelId } = trainRes
  chai.expect(modelId).to.be.a('string').and.not.to.be.empty

  const ts = await pollTrainingUntil({
    nluClient: client,
    modelId,
    appId,
    maxTime: ms('5s'),
    condition: (ts: TrainingState) => ts.status !== 'training-pending'
  })

  chai.expect(ts.status).to.equal(<TrainingStatus>'training')
  chai.expect(ts.error).to.be.undefined

  return modelId
}

export const assertLintingStarts = async (
  args: AssertionArgs,
  speed: IssueComputationSpeed,
  trainSet: TrainInput
): Promise<string> => {
  const { client, logger, appId } = args
  logger.debug('assert linting starts')

  const contexts = _getContexts(trainSet)
  const trainRes = await client.startLinting(appId, { ...trainSet, contexts, speed })
  if (!trainRes.success) {
    throw new UnsuccessfullAPICall(trainRes.error)
  }

  const { modelId } = trainRes
  chai.expect(modelId).to.be.a('string').and.not.to.be.empty

  const ts = await pollLintingUntil({
    nluClient: client,
    modelId,
    appId,
    speed,
    maxTime: ms('5s'),
    condition: (ts: LintingState) => ts.status !== 'linting-pending'
  })

  const allowed: LintingStatus[] = ['linting', 'done'] // linting process is currently to short
  chai.expect(ts.status).to.be.oneOf(allowed)
  chai.expect(ts.error).to.be.undefined

  return modelId
}

export const assertTrainingFails = async (
  args: AssertionArgs,
  trainSet: TrainInput,
  expectedError: TrainingErrorType
): Promise<void> => {
  const { client, logger, appId } = args
  logger.debug('assert training fails')

  const contexts = _getContexts(trainSet)
  const trainRes = await client.startTraining(appId, { ...trainSet, contexts })
  if (!trainRes.success) {
    throw new UnsuccessfullAPICall(trainRes.error)
  }

  const { modelId } = trainRes
  chai.expect(modelId).to.be.a('string').and.not.to.be.empty

  const ts = await pollTrainingUntil({
    nluClient: client,
    modelId,
    appId,
    maxTime: ms('5s'),
    condition: (ts: TrainingState) => ts.status !== 'training-pending' && ts.status !== 'training'
  })

  chai.expect(ts.status).to.equal(<TrainingStatus>'errored')
  chai.expect(ts.error?.type).to.equal(expectedError)
}

export const assertQueueTrainingFails = async (
  args: AssertionArgs,
  trainSet: TrainInput,
  expectedError: http.ErrorType
): Promise<void> => {
  const { client, logger, appId } = args
  logger.debug('assert queue training fails')

  const contexts = _getContexts(trainSet)
  const trainRes = await client.startTraining(appId, { ...trainSet, contexts })

  if (trainRes.success) {
    throw new Error(`Expected Queue training to fail with error: "${expectedError}"`)
  }

  const { error } = trainRes
  chai.expect(error.type).to.equal(expectedError)
}

export const assertCancelTrainingFails = async (
  args: AssertionArgs,
  modelId: string,
  expectedError: http.ErrorType
): Promise<void> => {
  const { client, logger, appId } = args
  logger.debug('assert cancel training fails')

  const cancelRes = await client.cancelTraining(appId, modelId)
  if (cancelRes.success) {
    throw new Error(`Expected training cancel to fail with error: "${expectedError}"`)
  }

  const { error } = cancelRes
  chai.expect(error.type).to.equal(expectedError)
}

export const assertTrainingCancels = async (args: AssertionArgs, modelId: string): Promise<void> => {
  const { client, logger, appId } = args
  logger.debug('assert training cancels')

  const cancelRes = await client.cancelTraining(appId, modelId)
  if (!cancelRes.success) {
    throw new UnsuccessfullAPICall(cancelRes.error)
  }

  const ts = await pollTrainingUntil({
    nluClient: client,
    modelId,
    appId,
    maxTime: ms('5s'),
    condition: (ts: TrainingState) => ts.status !== 'training'
  })

  chai.expect(ts.status).to.equal(<TrainingStatus>'canceled')
  chai.expect(ts.error).to.be.undefined
}

export const assertTrainingFinishes = async (args: AssertionArgs, modelId: string): Promise<void> => {
  const { client, logger, appId } = args
  logger.debug('asserts training finishes')

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
      appId,
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

export const assertLintingFinishes = async (
  args: AssertionArgs,
  speed: IssueComputationSpeed,
  modelId: string
): Promise<DatasetIssue<IssueCode>[]> => {
  const { client, logger, appId } = args
  logger.debug('asserts linting finishes')

  const ts = await pollLintingUntil({
    nluClient: client,
    modelId,
    appId,
    speed,
    maxTime: -1,
    condition: (ts: LintingState) => {
      return ts.status !== 'linting'
    }
  })

  chai.expect(ts.status).to.equal(<TrainingStatus>'done')
  chai.expect(ts.error).to.be.undefined
  return ts.issues
}

export const assertTrainingsAre = async (args: AssertionArgs, expectedTrainings: TrainingStatus[]) => {
  const { client, logger, appId } = args
  logger.debug(`assert trainings are: [${expectedTrainings.join(', ')}]`)

  const lsTrainingRes = await client.listTrainings(appId)
  if (!lsTrainingRes.success) {
    throw new UnsuccessfullAPICall(lsTrainingRes.error)
  }
  const { trainings } = lsTrainingRes
  const trainStatuses = trainings.map((ts) => ts.status)
  chai.expect(trainStatuses).to.include.members(expectedTrainings)
}

export const assertPredictionFails = async (
  args: AssertionArgs,
  modelId: string,
  utterance: string,
  expectedError: http.ErrorType
) => {
  const { client, logger, appId } = args
  logger.debug('assert prediction fails')

  const predictRes = await client.predict(appId, modelId, { utterances: [utterance] })
  if (predictRes.success) {
    throw new Error(`Expected Prediction to fail with error: "${expectedError}"`)
  }
  const { error } = predictRes
  chai.expect(error.type).to.equal(expectedError)
}

export const assertLanguageDetectionWorks = async (args: AssertionArgs, utterance: string, expectedLang: string) => {
  const { client, logger, appId } = args
  logger.debug('assert language detection works')

  const detectLangRes = await client.detectLanguage(appId, { utterances: [utterance], models: [] })
  if (!detectLangRes.success) {
    throw new UnsuccessfullAPICall(detectLangRes.error)
  }
  const { detectedLanguages } = detectLangRes
  chai.expect(detectedLanguages).to.have.length(1)
  chai.expect(detectedLanguages[0]).to.equal(expectedLang)
}

export const assertIntentPredictionWorks = async (
  args: AssertionArgs,
  modelId: string,
  utterance: string,
  expectedIntent: string
) => {
  const { client, logger, appId } = args
  logger.debug('assert intent prediction works')

  const predictRes = await client.predict(appId, modelId, { utterances: [utterance] })
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

export const assertModelsPrune = async (args: AssertionArgs) => {
  const { client, logger, appId } = args
  logger.debug('assert models can be pruned')

  const pruneRes = await client.pruneModels(appId)
  if (!pruneRes.success) {
    throw new UnsuccessfullAPICall(pruneRes.error)
  }

  const modelRes = await client.listModels(appId)
  if (!modelRes.success) {
    throw new UnsuccessfullAPICall(modelRes.error)
  }

  const { models } = modelRes
  chai.expect(models).to.have.length(0)
}
