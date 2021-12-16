import { IssueComputationSpeed } from './typings'

const speeds: Record<IssueComputationSpeed, number> = {
  fastest: 0,
  fast: 1,
  slow: 2,
  slowest: 3
}

export const toInt = (speed: IssueComputationSpeed): number => {
  return speeds[speed]
}

export const is = (speed1: IssueComputationSpeed) => ({
  asFastAs: (speed2: IssueComputationSpeed) => {
    return toInt(speed1) <= toInt(speed2)
  }
})
