import { Test } from '../typings'
import { runLangDetectionTest } from './lang-detection'
import { runModelLifecycleTest } from './model-lifecycle'
import { runPredictionTest } from './prediction'
import { runTrainingErrorsTest } from './training'

const tests: Test[] = [runTrainingErrorsTest, runModelLifecycleTest, runLangDetectionTest, runPredictionTest]
export default tests
