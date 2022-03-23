import * as ptb from '@botpress/ptb-schema'
import _ from 'lodash'

let matrix_idx = 0
export const PTBFlatMatrixMsg = new ptb.PTBMessage('Matrix', {
  nCol: { type: 'int32', id: matrix_idx++, rule: 'required' },
  data: { type: 'double', id: matrix_idx++, rule: 'repeated' }
})
export type PTBFlatMatrix = ptb.Infer<typeof PTBFlatMatrixMsg>

export const flattenMatrix = (matrix: number[][]): PTBFlatMatrix => {
  if (!matrix.length) {
    return {
      nCol: 0,
      data: []
    }
  }

  const nCol = matrix[0].length
  const data = _.flatten(matrix)
  return {
    nCol,
    data
  }
}

export const unflattenMatrix = (flatMatrix: PTBFlatMatrix): number[][] => {
  return _.chunk(flatMatrix.data, flatMatrix.nCol)
}
