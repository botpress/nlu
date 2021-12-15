import _ from 'lodash'
import { DatasetIssue, IssueCode } from 'src/hints'
import { CheckingOptions, TrainInput } from '../../typings'
import { Tools } from '../typings'
import { C_000_Check } from './c_000'
import { C_001_Check } from './c_001'
import { C_002_Check } from './c_002'
import { E_000_Check } from './e_000'
import * as speed from './speed'
import { IssueChecker } from './typings'

const allCheckers: IssueChecker<IssueCode>[] = [C_000_Check, C_001_Check, C_002_Check, E_000_Check]

const DEFAULT_OPTS: CheckingOptions = {
  minSpeed: 'slow',
  progressCallback: () => {}
}

export const hintsPipeline = async (ts: TrainInput, tools: Tools, opts: Partial<CheckingOptions> = {}) => {
  const options = { ...DEFAULT_OPTS, ...opts }

  let allIssues: DatasetIssue<IssueCode>[] = []
  let idx = 0

  const targetCheckers = allCheckers.filter((c) => speed.is(c.speed).asFastAs(options.minSpeed))

  for (const checker of targetCheckers) {
    const issues = await checker.check(ts, tools)
    options.progressCallback(++idx, targetCheckers.length, issues)
    allIssues = [...allIssues, ...issues]
  }

  return allIssues
}
