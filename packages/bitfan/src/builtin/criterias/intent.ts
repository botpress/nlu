import _ from 'lodash'
import * as sdk from 'src/bitfan'

import { areSame, isOOS, splitIntentTopic } from '../../builtin/labels'
import { mostConfident } from '../election/mostConfident'

export const labelIs: typeof sdk.criterias.labelIs = {
  name: 'labelIs',
  eval: <T extends sdk.SingleLabel>(res: sdk.Prediction<T>): number => {
    const { candidates, label } = res
    const elected = mostConfident(candidates)
    return areSame<sdk.SingleLabel>(label, elected) ? 1 : 0
  }
}

export const labelHasTopic: typeof sdk.criterias.labelHasTopic = {
  name: 'labelHasTopic',
  eval: (res: sdk.Prediction<'intent-topic'>): number => {
    const { candidates, label } = res
    const elected = mostConfident(candidates)

    if (isOOS(elected) && isOOS(label)) {
      return 1
    } else if (isOOS(elected) || isOOS(label)) {
      return 0
    }

    const { topic: topicLabel } = splitIntentTopic(label)
    const { topic: topicElected } = splitIntentTopic(elected)
    return topicLabel === topicElected ? 1 : 0
  }
}
