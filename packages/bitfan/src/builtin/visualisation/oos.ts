import * as sdk from 'bitfan/sdk'
import chalk from 'chalk'
import _ from 'lodash'
import { oosConfusion } from '../metrics/oos'

export const showOOSConfusion: typeof sdk.visualisation.showOOSConfusion = async (
  results: sdk.Result<sdk.SingleLabel>[]
) => {
  const { truePos, falsePos, falseNeg, trueNeg } = oosConfusion(results)

  const confusionMatrix = {
    'elected is oo-scope': {
      'actual is oo-scope': truePos,
      'actual is in-scope': falsePos
    },
    'elected is in-scope': {
      'actual is oo-scope': falseNeg,
      'actual is in-scope': trueNeg
    }
  }

  // eslint-disable-next-line no-console
  console.log(chalk.green('OOS Confusion Matrix: '))
  console.table(confusionMatrix)
}
