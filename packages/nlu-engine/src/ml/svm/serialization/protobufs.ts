import * as ptb from '@botpress/ptb-schema'

let matrix_idx = 0
export const PTBFlatMatrixMsg = new ptb.PTBMessage('Matrix', {
  nCol: { type: 'int32', id: matrix_idx++ },
  data: { type: 'double', id: matrix_idx++, rule: 'repeated' }
})
export type PTBFlatMatrix = ptb.Infer<typeof PTBFlatMatrixMsg>

let param_idx = 0
const PTBParametersMsg = new ptb.PTBMessage('LIBSVM_Parameters', {
  svm_type: { type: 'int32', id: param_idx++ },
  kernel_type: { type: 'int32', id: param_idx++ },
  cache_size: { type: 'double', id: param_idx++ },
  eps: { type: 'double', id: param_idx++ },
  nr_weight: { type: 'int32', id: param_idx++ },
  weight_label: { type: 'int32', id: param_idx++, rule: 'repeated' },
  weight: { type: 'double', id: param_idx++, rule: 'repeated' },
  shrinking: { type: 'bool', id: param_idx++ },
  probability: { type: 'bool', id: param_idx++ },
  C: { type: 'double', id: param_idx++ },
  gamma: { type: 'double', id: param_idx++ },
  degree: { type: 'int32', id: param_idx++ },
  nu: { type: 'double', id: param_idx++ },
  p: { type: 'double', id: param_idx++ },
  coef0: { type: 'double', id: param_idx++ }
})
export type PTBParameters = ptb.Infer<typeof PTBParametersMsg>

let model_idx = 0
export const PTBModelMsg = new ptb.PTBMessage('LIBSVM_Model', {
  param: { type: PTBParametersMsg, id: model_idx++ },
  nr_class: { type: 'int32', id: model_idx++ },
  l: { type: 'int32', id: model_idx++ },
  SV: { type: PTBFlatMatrixMsg, id: model_idx++ },
  sv_coef: { type: PTBFlatMatrixMsg, id: model_idx++ },
  rho: { type: 'double', id: model_idx++, rule: 'repeated' },
  probA: { type: 'double', id: model_idx++, rule: 'repeated' },
  probB: { type: 'double', id: model_idx++, rule: 'repeated' },
  sv_indices: { type: 'int32', id: model_idx++, rule: 'repeated' },
  label: { type: 'int32', id: model_idx++, rule: 'repeated' },
  nSV: { type: 'int32', id: model_idx++, rule: 'repeated' },
  free_sv: { type: 'int32', id: model_idx++ },

  mu: { type: 'double', id: param_idx++, rule: 'repeated' },
  sigma: { type: 'double', id: param_idx++, rule: 'repeated' },
  u: { type: PTBFlatMatrixMsg, id: param_idx++, rule: 'optional' },

  labels_idx: { type: 'string', id: model_idx++, rule: 'repeated' }
})
