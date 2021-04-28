import _ from 'lodash'
import * as sdk from 'src/bitfan'

import { labelIs, labelHasTopic } from './builtin/criterias/intent'
import { slotsAre, slotIncludes, slotCountIs } from './builtin/criterias/slot'

import { listFiles, readDataset, readDocument } from './builtin/datasets/index'
import { mostConfident, mostConfidents } from './builtin/election/mostConfident'




import { BpIntentEngine } from './builtin/engines/intent'
import { BpSlotEngine } from './builtin/engines/slot'
import { BpSpellingEngine } from './builtin/engines/spell'
import { BpTopicEngine } from './builtin/engines/topic'

import { areSame, isOOS, makeKey } from './builtin/labels'
import { averageScore } from './builtin/metrics/avgScores'
import { inScopeAccuracy } from './builtin/metrics/in-scope'
import { oosAccuracy, oosPrecision, oosRecall, oosF1 } from './builtin/metrics/oos'
import { sampleClasses } from './builtin/sampling/samplesClasses'
import { splitOOS, pickOOS } from './builtin/sampling/splitAndMakeOOS'
import { trainTestSplit, subSample } from './builtin/sampling/trainTestSplit'

import { isAllDefined } from './builtin/tables/guards'
import { initDic, initTable } from './builtin/tables/init'
import { roundDic, roundTable } from './builtin/tables/round'
import { tabelize } from './builtin/tables/tabelize'
import { transposeTable } from './builtin/tables/transpose'
import { showClassDistribution, showDatasetsSummary } from './builtin/visualisation/dataset'
import { showOOSConfusion } from './builtin/visualisation/oos'
import { showPerformanceReport, showComparisonReport } from './builtin/visualisation/report'
import { showSlotsResults } from './builtin/visualisation/slots'

import comparePerformances from './compare'
import evaluateMetrics from './report'
import runSolution from './solution'


// TODO: write actual implementation
const impl: typeof sdk = {
  runSolution,
  evaluateMetrics,
  comparePerformances,

  labels: {
    isOOS,
    areSame,
    makeKey
  },

  election: {
    mostConfident,
    mostConfidents
  },

  sampling: {
    trainTestSplit,
    subSample,
    splitOOS,
    pickOOS,
    sampleClasses
  },

  // TODO lazy load these...
  datasets: {
    listFiles,
    readDataset,
    readDocument
  },

  criterias: {
    labelIs,
    labelHasTopic,
    slotsAre,
    slotCountIs,
    slotIncludes
  },

  metrics: {
    averageScore,
    accuracy: {
      name: 'accuracy',
      eval: averageScore(labelIs).eval
    },
    inScopeAccuracy,
    oosAccuracy,
    oosPrecision,
    oosRecall,
    oosF1
  },

  visualisation: {
    showOOSConfusion,
    showPerformanceReport,
    showComparisonReport,
    showClassDistribution,
    showDatasetsSummary,
    showSlotsResults
  },

  engines: {
    makeBpTopicEngine: (bpEndpoint: string, password: string) => new BpTopicEngine(bpEndpoint, password),
    makeBpIntentEngine: (bpEndpoint: string, password: string) => new BpIntentEngine(bpEndpoint, password),
    makeBpSlotEngine: (bpEndpoint: string, password: string) => new BpSlotEngine(bpEndpoint, password),
    makeBpSpellEngine: (bpEndpoint: string, password: string) => new BpSpellingEngine(bpEndpoint, password)
  },

  tables: {
    tabelize,
    initDic,
    initTable,
    roundDic,
    roundTable,
    transposeTable,
    isAllDefined
  }
}

export default impl
