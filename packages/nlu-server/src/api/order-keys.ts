import _ from 'lodash'

// Taken from https://github.com/botpress/botpress/blob/master/modules/nlu/src/backend/application/bot/order-keys.ts

export const orderKeys = <T>(x: T): T => {
  if (typeof x !== 'object') {
    return x
  }

  for (const k in x) {
    x[k] = orderKeys(x[k])
  }

  if (_.isArray(x)) {
    return x
  }

  return _(x).toPairs().sortBy(0).fromPairs().value() as T
}
