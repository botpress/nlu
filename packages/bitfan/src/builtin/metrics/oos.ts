import * as sdk from 'bitfan/sdk'
import _ from 'lodash'
import { isOOS } from '../../builtin/labels'

import { mostConfident } from '../election/mostConfident'

type ConfusionMatrix = {
  truePos: number
  falsePos: number
  trueNeg: number
  falseNeg: number
}

type OOSPerformance = {
  oosAccuracy: number
  oosPrecision: number
  oosRecall: number
  oosF1: number
}

const _computePerformance = (confusion: ConfusionMatrix): OOSPerformance => {
  const { truePos, falsePos, falseNeg, trueNeg } = confusion
  const total = truePos + falsePos + falseNeg + trueNeg

  const accuracy = (truePos + trueNeg) / total
  const precision = truePos / (truePos + falsePos)
  const recall = truePos / (truePos + falseNeg)
  const f1 = 2 * ((precision * recall) / (precision + recall))

  return {
    oosAccuracy: accuracy,
    oosPrecision: precision,
    oosRecall: recall,
    oosF1: f1
  }
}

export const oosConfusion = (results: sdk.Result<sdk.SingleLabel>[]) => {
  const oosResults = results.map((r) => {
    const elected = mostConfident(r.candidates)
    const expected = r.label

    return {
      electedIsOOS: isOOS(elected),
      expectedIsOOS: isOOS(expected)
    }
  })

  const truePos = oosResults.filter((r) => r.electedIsOOS && r.expectedIsOOS).length
  const falsePos = oosResults.filter((r) => r.electedIsOOS && !r.expectedIsOOS).length
  const trueNeg = oosResults.filter((r) => !r.electedIsOOS && !r.expectedIsOOS).length
  const falseNeg = oosResults.filter((r) => !r.electedIsOOS && r.expectedIsOOS).length

  return {
    truePos,
    falsePos,
    falseNeg,
    trueNeg
  }
}

export const oosAccuracy: typeof sdk.metrics.oosAccuracy = {
  name: 'oosAccuracy',
  eval: (results: sdk.Result<sdk.SingleLabel>[]) => {
    const confusionMatrix = oosConfusion(results)
    const { oosAccuracy } = _computePerformance(confusionMatrix)
    return oosAccuracy
  }
}

export const oosPrecision: typeof sdk.metrics.oosPrecision = {
  name: 'oosPrecision',
  eval: (results: sdk.Result<sdk.SingleLabel>[]) => {
    const confusionMatrix = oosConfusion(results)
    const { oosPrecision } = _computePerformance(confusionMatrix)
    return oosPrecision
  }
}

export const oosRecall: typeof sdk.metrics.oosRecall = {
  name: 'oosRecall',
  eval: (results: sdk.Result<sdk.SingleLabel>[]) => {
    const confusionMatrix = oosConfusion(results)
    const { oosRecall } = _computePerformance(confusionMatrix)
    return oosRecall
  }
}

export const oosF1: typeof sdk.metrics.oosF1 = {
  name: 'oosF1',
  eval: (results: sdk.Result<sdk.SingleLabel>[]) => {
    const confusionMatrix = oosConfusion(results)
    const { oosF1 } = _computePerformance(confusionMatrix)
    return oosF1
  }
}
