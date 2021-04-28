import * as sdk from 'bitfan/sdk'
import { isOOS } from '../../builtin/labels'

import _ from 'lodash'
import { mostConfident } from '../election/mostConfident'

export const inScopeAccuracy: typeof sdk.metrics.inScopeAccuracy = {
  name: 'inScopeAccuracy',
  eval: (results: sdk.Result<sdk.SingleLabel>[]) => {
    const inScopeSamples = results.filter((r) => !isOOS(r.label))

    const totalScore = inScopeSamples.reduce((totalScore, currentSample) => {
      const elected = mostConfident(currentSample.candidates, {
        ignoreOOS: true
      })
      const currentScore = elected === currentSample.label ? 1 : 0
      return totalScore + currentScore
    }, 0)

    return totalScore / inScopeSamples.length
  }
}
