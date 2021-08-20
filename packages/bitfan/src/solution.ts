import * as sdk from 'bitfan/sdk'
import chalk from 'chalk'
import cliProgress from 'cli-progress'
import _ from 'lodash'
import { isUnsupervisedProblem } from './guards'

const runSolution = async <T extends sdk.ProblemType>(
  solution: sdk.Solution<T> | sdk.UnsupervisedSolution<T>,
  seeds: number[]
) => {
  const allResults: sdk.Result<T>[] = []

  const runSolutionForSeed = makeSolutionRunner({ allResults }, solution)
  for (const seed of seeds) {
    await runSolutionForSeed(seed)
  }

  return allResults
}

const makeSolutionRunner = <T extends sdk.ProblemType>(
  state: {
    allResults: sdk.Result<T>[]
  },
  solution: sdk.Solution<T> | sdk.UnsupervisedSolution<T>
) => async (seed: number) => {
  const { allResults } = state

  const { name, problems } = solution

  // eslint-disable-next-line no-console
  console.log(chalk.green(chalk.bold(`Running Solution ${name} with seed ${seed}`)))

  const solutionResults: sdk.Result<T>[] = []

  const runProblem = makeProblemRunner({ solutionResults }, seed)
  for (const problem of problems) {
    try {
      await runProblem({ problem, engine: solution.engine } as any) // TODO: refactor this
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(
        chalk.red(
          `The following error occured when solving problem ${problem.name} with seed ${seed}:\n${err.message}\n${err.stack}`
        )
      )
      process.exit(1)
    }
  }

  allResults.push(...solutionResults)

  if (!!solution.cb) {
    // eslint-disable-next-line no-console
    console.log(chalk.green(chalk.bold('Results for All Problems')))
    await solution.cb(solutionResults)
    // eslint-disable-next-line no-console
    console.log('\n')
  }
}

interface Unsupervised<T extends sdk.ProblemType> {
  problem: sdk.UnsupervisedProblem<T>
  engine: sdk.UnsupervisedEngine<T>
}

interface Supervised<T extends sdk.ProblemType> {
  problem: sdk.Problem<T>
  engine: sdk.Engine<T>
}

const isSupervised = <T extends sdk.ProblemType>(args: Unsupervised<T> | Supervised<T>): args is Supervised<T> => {
  return !isUnsupervisedProblem(args.problem)
}

const isUnsupervised = <T extends sdk.ProblemType>(args: Unsupervised<T> | Supervised<T>): args is Unsupervised<T> => {
  return isUnsupervisedProblem(args.problem)
}

const makeProblemRunner = <T extends sdk.ProblemType>(
  state: {
    solutionResults: sdk.Result<T>[]
  },
  seed: number
) => async (args: Unsupervised<T> | Supervised<T>) => {
  const { solutionResults } = state

  const { engine, problem } = args

  // eslint-disable-next-line no-console
  console.log(chalk.green(chalk.bold(`Problem ${problem.name}`)))

  const trainProgressBar = new cliProgress.Bar({
    format: 'Training: [{bar}] ({percentage}%), {duration}s',
    stream: process.stdout,
    noTTYOutput: true
  })
  trainProgressBar.start(100, 0)

  const trainProgress = (p: number) => {
    if (p === 1) {
      p = 0.99
    }
    trainProgressBar.update(p * 100)
  }

  if (isUnsupervised(args)) {
    await args.engine.train(args.problem.corpus, seed, trainProgress)
  }
  if (isSupervised(args)) {
    await args.engine.train(args.problem.trainSet, seed, trainProgress)
  }

  trainProgressBar.update(100)
  trainProgressBar.stop()

  const predictProgressBar = new cliProgress.Bar({
    format: 'Prediction: [{bar}] ({percentage}%), {duration}s',
    stream: process.stdout,
    noTTYOutput: true
  })
  predictProgressBar.start(100, 0)

  const predictOutputs = await engine.predict(problem.testSet, (p: number) => {
    if (p === 1) {
      p = 0.99
    }
    predictProgressBar.update(p * 100)
  })
  predictProgressBar.update(100)
  predictProgressBar.stop()
  // eslint-disable-next-line no-console
  console.log('')

  const results: sdk.Result<T>[] = predictOutputs.map((p) => {
    return {
      ...p,
      metadata: {
        seed,
        problem: problem.name
      }
    }
  })

  solutionResults.push(...results)

  if (!!problem.cb) {
    // eslint-disable-next-line no-console
    console.log(chalk.green(chalk.bold(`Results for Problem ${problem.name}`)))
    await problem.cb(results)
    // eslint-disable-next-line no-console
    console.log('\n')
  }
}

export default runSolution
