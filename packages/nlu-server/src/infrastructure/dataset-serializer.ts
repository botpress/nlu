import { TrainInput } from '@botpress/nlu-client'
import jsonpack from 'jsonpack'

export const packTrainSet = (ts: TrainInput): string => {
  return jsonpack.pack(ts)
}

export const unpackTrainSet = (compressed: string): TrainInput => {
  return jsonpack.unpack<TrainInput>(compressed)
}
