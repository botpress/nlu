import { runLangDetectionTest } from './lang-detection'
import { runModelLifecycleTest } from './model-lifecycle'
import { runPredictionTest } from './prediction'
import { runTrainingTest } from './training'

export default [runTrainingTest, runModelLifecycleTest, runLangDetectionTest, runPredictionTest]
