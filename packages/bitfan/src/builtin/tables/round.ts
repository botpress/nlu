import * as sdk from 'bitfan/sdk'
import _ from 'lodash'

export const roundDic: typeof sdk.tables.roundDic = (dic: _.Dictionary<number>, precision = 4) => {
  return _.mapValues(dic, (v) => (_.isNumber(v) ? _.round(v, precision) : v))
}

export const roundTable: typeof sdk.tables.roundTable = (table: _.Dictionary<_.Dictionary<number>>, precision = 4) => {
  return _.mapValues(table, (t) => roundDic(t, precision))
}
