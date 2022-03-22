import { DatasetIssue, IssueCode, IssueComputationSpeed } from '@botpress/nlu-client'
import { ModelId, modelIdService } from '@botpress/nlu-engine'
import { AxiosError } from 'axios'
import { ResponseError } from '../api/errors'

export class ModelDoesNotExistError extends ResponseError {
  constructor(appId: string, modelId: ModelId) {
    const stringId = modelIdService.toString(modelId)
    const trainKey = `${appId}/${stringId}`
    super(`model ${trainKey} can't be found`, 404)
  }
}

export class TrainingNotFoundError extends ResponseError {
  constructor(appId: string, modelId: ModelId) {
    const stringId = modelIdService.toString(modelId)
    const trainKey = `${appId}/${stringId}`
    super(`no current training for: ${trainKey}`, 404)
  }
}

export class LintingNotFoundError extends ResponseError {
  constructor(appId: string, modelId: ModelId, speed: IssueComputationSpeed) {
    const stringId = modelIdService.toString(modelId)
    const trainKey = `${appId}/${stringId}`
    super(`no current linting with speed "${speed}" for: ${trainKey}`, 404)
  }
}

export class InvalidModelSpecError extends ResponseError {
  constructor(modelId: ModelId, currentSpec: string) {
    super(`expected spec hash to be "${currentSpec}". target model has spec "${modelId.specificationHash}".`, 400)
  }
}

export class TrainingAlreadyStartedError extends ResponseError {
  constructor(appId: string, modelId: ModelId) {
    const stringId = modelIdService.toString(modelId)
    const trainKey = `${appId}/${stringId}`
    super(`Training "${trainKey}" already started...`, 409)
  }
}

export class LintingAlreadyStartedError extends ResponseError {
  constructor(appId: string, modelId: ModelId) {
    const stringId = modelIdService.toString(modelId)
    const lintKey = `${appId}/${stringId}`
    super(`Linting "${lintKey}" already started...`, 409)
  }
}

export class LangServerCommError extends ResponseError {
  constructor(err: Error) {
    const { message } = err
    super(`An error occured during communication with language server: ${message}`, 500)
  }
}

export class DucklingCommError extends ResponseError {
  constructor(err: Error) {
    const { message } = err
    super(`An error occured during communication with Duckling server: ${message}`, 500)
  }
}

export class DatasetValidationError extends ResponseError {
  constructor(issues: DatasetIssue<IssueCode>[]) {
    const message = issues.map(({ code, message }) => `[${code}] ${message}`).join('\n')
    super(message, 400)
  }
}
