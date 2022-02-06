import { SvmModel, Parameters } from '../libsvm/typings'
import { flattenMatrix, unflattenMatrix } from './flat-matrix'
import { PTBParameters, PTBModelMsg } from './protobufs'

export const serializeModel = (model: SvmModel & { labels_idx: string[] }): Uint8Array => {
  const { SV, sv_coef, u, mu, sigma, ...others } = model
  return PTBModelMsg.encode({
    ...others,
    SV: flattenMatrix(SV),
    sv_coef: flattenMatrix(sv_coef),
    u: u && flattenMatrix(u),
    mu,
    sigma
  })
}

const deserializeParams = (params: PTBParameters): Parameters => {
  const { weight_label, weight, ...others } = params
  return {
    weight_label: weight_label ?? [],
    weight: weight ?? [],
    ...others
  }
}

export const deserializeModel = (serialized: Uint8Array): SvmModel & { labels_idx: string[] } => {
  const model = PTBModelMsg.decode(serialized)
  const { SV, sv_coef, u, param, rho, probA, probB, sv_indices, label, nSV, labels_idx, ...others } = model
  return {
    param: deserializeParams(param),
    SV: unflattenMatrix(SV),
    sv_coef: unflattenMatrix(sv_coef),
    u: u && unflattenMatrix(u),
    rho: rho ?? [],
    probA: probA ?? [],
    probB: probB ?? [],
    sv_indices: sv_indices ?? [],
    label: label ?? [],
    nSV: nSV ?? [],
    labels_idx: labels_idx ?? [],
    ...others
  }
}
