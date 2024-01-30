export function runSolution<T extends ProblemType>(
  solution: Solution<T> | UnsupervisedSolution<T>,
  seeds: number[]
): Promise<Result<T>[]>

export function evaluateMetrics<T extends ProblemType>(results: Result<T>[], metrics: Metric<T>[]): PerformanceReport

export function comparePerformances(
  currentPerformance: PerformanceReport,
  previousPerformance: PerformanceReport,
  options?: Partial<CompareOptions>
): ComparisonReport

export namespace datasets {
  export const listFiles: () => Promise<(DataSetDef<ProblemType> | DocumentDef)[]>

  export const readDataset: <T extends ProblemType>(dsInfo: DataSetDef<T>) => Promise<DataSet<T>>
  export const readDocument: (docInfo: DocumentDef) => Promise<Document>
}

export namespace election {
  export const mostConfident: <T extends ProblemType>(
    candidates: Candidate<T>[],
    opt?: Partial<{
      ignoreOOS: boolean
    }>
  ) => Elected<T>
  export const mostConfidents: <T extends ProblemType>(
    candidates: Candidate<T>[],
    n: number,
    opt?: Partial<{
      ignoreOOS: boolean
    }>
  ) => Elected<T>[]
}

export namespace criterias {
  /**
   * @description Most basic criteria.
   * @returns 1 if most confident label is the expected one and 0 else
   */
  export const labelIs: Criteria<SingleLabel>
  export const labelHasTopic: Criteria<'intent-topic'>

  export const slotsAre: Criteria<'slot'>
  export const slotIncludes: Criteria<'slot'>
  export const slotCountIs: Criteria<'slot'>
}

export namespace metrics {
  export const averageScore: <T extends ProblemType>(criteria: Criteria<T>) => Metric<T>

  /**
   * @description Equivalent to computing average score with criteria "labelIs"
   * @returns Accuracy of correctly identified labels, using the most confident as the elected one
   */
  export const accuracy: Metric<SingleLabel>

  /**
   * @description Accuracy metrics computed only on in-scope samples. Elects most confident label, but ignore OOS.
   */
  export const inScopeAccuracy: Metric<SingleLabel>
  export const oosAccuracy: Metric<SingleLabel>
  export const oosPrecision: Metric<SingleLabel>
  export const oosRecall: Metric<SingleLabel>
  export const oosF1: Metric<SingleLabel>
}

export namespace visualisation {
  export const showOOSConfusion: ResultViewer<SingleLabel>
  export const showSlotsResults: ResultViewer<'slot'>

  export const showClassDistribution: DatasetViewer<SingleLabel>
  export const showDatasetsSummary: DatasetViewer<ProblemType>

  export const showPerformanceReport: (
    report: PerformanceReport,
    opt?: Partial<{
      groupBy: 'seed' | 'problem' | 'all'
    }>
  ) => void

  export const showComparisonReport: (name: string, comparison: ComparisonReport) => void
}

export namespace engines {
  export const makeBpIntentEngine: (bpEndpoint: string) => Engine<'intent'>
  export const makeBpTopicEngine: (bpEndpoint: string) => Engine<'topic'>
  export const makeBpSlotEngine: (bpEndpoint: string) => Engine<'slot'>
  export const makeBpSpellEngine: (bpEndpoint: string) => UnsupervisedEngine<'spell'>
}

export namespace sampling {
  export const trainTestSplit: <T extends ProblemType>(
    dataset: DataSet<T>,
    trainPercent: number,
    seed: number,
    options?: { stratificate: boolean }
  ) => {
    trainSet: DataSet<T>
    testSet: DataSet<T>
  }

  export const subSample: <T extends ProblemType>(
    dataset: DataSet<T>,
    percent: number,
    seed: number,
    options?: { stratificate: boolean }
  ) => DataSet<T>

  export const sampleClasses: <T extends SingleLabel>(
    datasets: DataSet<T>[],
    nClass: number,
    seed: number,
    opt?: Partial<{ keepOOS: boolean }>
  ) => DataSet<T>[]

  export const pickOOS: <T extends SingleLabel>(dataset: DataSet<T>, oosPercent: number, seed: number) => Label<T>[]

  export const splitOOS: <T extends SingleLabel>(
    dataset: DataSet<T>,
    labels: Label<T>[]
  ) => { inScopeSet: DataSet<T>; ooScopeSet: DataSet<T> }
}

export namespace labels {
  export function areSame<T extends ProblemType>(label1: Label<T>, label2: Label<T>): boolean

  export function isOOS<T extends ProblemType>(label: Label<T>): boolean

  export function makeKey<T extends ProblemType>(label: Label<T>): string
}

export namespace tables {
  export const tabelize: <D>(
    data: D[],
    disposition: {
      row: (d: D) => string
      column: (d: D) => string
      score: (d: D) => number
      aggregator?: (scores: number[]) => number
    }
  ) => Table<number>

  export const transposeTable: <D>(table: Table<D>) => Table<D>

  export const roundTable: (table: Table<number>, precision?: number) => Table<number>

  export const roundDic: (table: Dic<number>, precision?: number) => Dic<number>

  export const initTable: <D>(rows: string[], columns: string[], init: () => D) => Table<D>

  export const initDic: <D>(keys: string[], init: () => D) => Dic<D>

  export const isAllDefined: <D>(dic: Dic<D | undefined>) => dic is Dic<D>
}

/**
 * @description Collection of problems with an engine to solve them
 */
export type Solution<T extends ProblemType> = {
  name: string
  problems: Problem<T>[]
  engine: Engine<T>
  cb?: ResultViewer<T>
}

export type UnsupervisedSolution<T extends ProblemType> = {
  name: string
  problems: UnsupervisedProblem<T>[]
  engine: UnsupervisedEngine<T>
  cb?: ResultViewer<T>
}

export type SingleLabel = 'intent' | 'topic' | 'intent-topic' // label of an "intent-topic" problem is "topic/intent"
export type MultiLabel = 'multi-intent' | 'multi-intent-topic'

/**
 * @name ProblemType
 * @description All solvable problem types
 */
export type ProblemType = SingleLabel | MultiLabel | 'spell' | 'lang' | 'slot'

type Dic<T> = {
  [key: string]: T
}

type Table<T> = Dic<Dic<T>>

/**
 * @description Format of a label for a given problem type.
 *  For intent problems, its only a string, but for slots, it contains more information
 */
export type Label<T extends ProblemType> = T extends SingleLabel
  ? string
  : T extends MultiLabel
  ? string[]
  : T extends 'slot'
  ? { name: string; start: number; end: number }[]
  : string

export type Candidate<T extends ProblemType> = {
  elected: Elected<T>
  confidence: number
}

export type Elected<T extends ProblemType> = T extends 'slot' ? { name: string; start: number; end: number } : string

type BaseProblem<T extends ProblemType> = {
  name: string
  type: ProblemType
  testSet: DataSet<T>
  lang: string
  cb?: ResultViewer<T>
}

/**
 * @description Collection of one train dataset and one test dataset
 */
export type Problem<T extends ProblemType> = BaseProblem<T> & {
  trainSet: DataSet<T>
}

export type UnsupervisedProblem<T extends ProblemType> = BaseProblem<T> & {
  corpus: Document[]
}

export type ProgressCb = (p: number) => void

type Predictor<T extends ProblemType> = {
  predict: (testSet: DataSet<T>, progress: ProgressCb) => Promise<Prediction<T>[]>
}

/**
 * @description Collection of a train function and a predict function
 */
export type Engine<T extends ProblemType> = Predictor<T> & {
  train: (trainSet: DataSet<T>, seed: number, progress: ProgressCb) => Promise<void>
}

export type UnsupervisedEngine<T extends ProblemType> = Predictor<T> & {
  train: (corpus: Document[], seed: number, progress: ProgressCb) => Promise<void>
}

export type Prediction<T extends ProblemType> = {
  text: string
  candidates: Candidate<T>[]
  label: Label<T>
}

/**
 * @description Function that decides weither or not a test should pass or fail.
 * @returns A number between 0 and 1 where 0 means that the test has failed.
 * For multi-class problems, this number will often be, neither 1 or 0, but a fraction.
 */
export type Criteria<T extends ProblemType> = {
  name: string
  eval(res: Prediction<T>): number
}

export type Result<T extends ProblemType> = Prediction<T> & {
  metadata: {
    seed: number
    problem: string
  }
}

export type ResultViewer<T extends ProblemType, O extends Object = {}> = (
  results: Result<T>[],
  options?: Partial<O>
) => Promise<void>

export type DatasetViewer<T extends ProblemType> = (...datasets: DataSet<T>[]) => void

export type ScoreInfo = {
  metric: string
  seed: number
  problem: string
  score: number
}

export type PerformanceReport = {
  generatedOn: Date
  scores: ScoreInfo[]
}

export type RegressionStatus = 'success' | 'regression' | 'tolerated-regression'

export type RegressionReason = {
  status: RegressionStatus
  metric: string
  problem: string
  seed: number
  currentScore: number
  previousScore: number
  allowedRegression: number
}

export type ComparisonReport = {
  status: RegressionStatus
  reasons: RegressionReason[]
}

export type CompareOptions = {
  toleranceByMetric: Dic<number>
}

/**
 * @description Function that compute a performance score given the whole results.
 * @returns A performance score between 0 and 1.
 */
export type Metric<T extends ProblemType> = {
  name: string
  eval: (res: Result<T>[]) => number
}

export type DataSet<T extends ProblemType> = {
  name: string
  type: T
  lang: string
  samples: Sample<T>[]
} & (T extends 'slot' ? VariablesDef : {})

export type VariablesDef = {
  variables: Variable[]
  patterns: Pattern[]
  enums: Enum[]
}

export type Document = {
  name: string
  type: ProblemType
  lang: string
  text: string
}

export type FileType = 'document' | 'dataset'
type FileDef<T extends ProblemType, F extends FileType> = {
  name: string
  type: T
  fileType: F
  lang: string
  namespace: string
}
export type DataSetDef<T extends ProblemType> = FileDef<T, 'dataset'>
export type DocumentDef = FileDef<ProblemType, 'document'>

type Variable = {
  name: string
  types: string[]
}

type Enum = {
  name: string
  values: { name: string; synonyms: string[] }[]
  fuzzy: number
}

type Pattern = {
  name: string
  regex: string
  case_sensitive: boolean
}

type Sample<T extends ProblemType> = {
  text: string
  label: Label<T>
}
