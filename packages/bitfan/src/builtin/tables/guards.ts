import * as sdk from 'bitfan/sdk'
import _ from 'lodash'

export const isAllDefined = <D>(dic: sdk.Dic<D | undefined>): dic is sdk.Dic<D> => {
  return !Object.values(dic).some((v) => _.isUndefined(v))
}
