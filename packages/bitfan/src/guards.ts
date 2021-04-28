import * as sdk from 'bitfan/sdk'

export const isUnsupervisedSolution = <T extends sdk.ProblemType>(
  solution: sdk.Solution<T> | sdk.UnsupervisedSolution<T>
): solution is sdk.UnsupervisedSolution<T> => {
  return solution.problems.some(isUnsupervisedProblem)
}

export const isUnsupervisedProblem = <T extends sdk.ProblemType>(
  prob: sdk.Problem<T> | sdk.UnsupervisedProblem<T>
): prob is sdk.UnsupervisedProblem<T> => {
  return !!(prob as sdk.UnsupervisedProblem<T>).corpus
}
