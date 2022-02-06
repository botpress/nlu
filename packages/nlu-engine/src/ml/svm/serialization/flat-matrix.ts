import _ from 'lodash'
import { PTBFlatMatrix } from './protobufs'

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
