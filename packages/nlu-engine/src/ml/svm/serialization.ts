import * as ptb from '@botpress/ptb-schema'
import { PTBFlatMatrixMsg } from './flat-matrix'

let param_idx = 0
export const PTBSVMClassifierParams = new ptb.PTBMessage('SVMClassifierParameters', {
  svm_type: { type: 'int32', id: param_idx++, rule: 'required' },
  kernel_type: { type: 'int32', id: param_idx++, rule: 'required' },
  cache_size: { type: 'double', id: param_idx++, rule: 'required' },
  eps: { type: 'double', id: param_idx++, rule: 'required' },
  nr_weight: { type: 'int32', id: param_idx++, rule: 'required' },
  weight_label: { type: 'int32', id: param_idx++, rule: 'repeated' },
  weight: { type: 'double', id: param_idx++, rule: 'repeated' },
  shrinking: { type: 'bool', id: param_idx++, rule: 'required' },
  probability: { type: 'bool', id: param_idx++, rule: 'required' },
  C: { type: 'double', id: param_idx++, rule: 'required' },
  gamma: { type: 'double', id: param_idx++, rule: 'required' },
  degree: { type: 'int32', id: param_idx++, rule: 'required' },
  nu: { type: 'double', id: param_idx++, rule: 'required' },
  p: { type: 'double', id: param_idx++, rule: 'required' },
  coef0: { type: 'double', id: param_idx++, rule: 'required' }
})

let model_idx = 0
export const PTBSVMClassifierModel = new ptb.PTBMessage('SVMClassifierModel', {
  param: { type: PTBSVMClassifierParams, id: model_idx++, rule: 'required' },
  nr_class: { type: 'int32', id: model_idx++, rule: 'required' },
  l: { type: 'int32', id: model_idx++, rule: 'required' },
  SV: { type: PTBFlatMatrixMsg, id: model_idx++, rule: 'required' },
  sv_coef: { type: PTBFlatMatrixMsg, id: model_idx++, rule: 'required' },
  rho: { type: 'double', id: model_idx++, rule: 'repeated' },
  probA: { type: 'double', id: model_idx++, rule: 'repeated' },
  probB: { type: 'double', id: model_idx++, rule: 'repeated' },
  sv_indices: { type: 'int32', id: model_idx++, rule: 'repeated' },
  label: { type: 'int32', id: model_idx++, rule: 'repeated' },
  nSV: { type: 'int32', id: model_idx++, rule: 'repeated' },
  free_sv: { type: 'int32', id: model_idx++, rule: 'required' },

  mu: { type: 'double', id: param_idx++, rule: 'repeated' },
  sigma: { type: 'double', id: param_idx++, rule: 'repeated' },
  u: { type: PTBFlatMatrixMsg, id: param_idx++, rule: 'optional' },

  labels_idx: { type: 'string', id: model_idx++, rule: 'repeated' }
})
