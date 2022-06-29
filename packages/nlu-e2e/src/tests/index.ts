import { Test } from '../typings'
import { langDetectionTest } from './lang-detection'
import { lintingTest } from './linting'
import { modelLifecycleTest } from './model-lifecycle'
import { modelWeightsTransferTest } from './modelweights-transfer'
import { predictionTest } from './prediction'
import { trainingErrorsTest } from './training'

const tests: Test[] = [
  trainingErrorsTest,
  lintingTest,
  modelWeightsTransferTest,
  modelLifecycleTest,
  langDetectionTest,
  predictionTest
]
export default tests
