import _ from 'lodash'
import { DatasetIssue, IssueCode } from '../../linting'
import { LintingOptions, TrainInput } from '../../typings'
import { Tools } from '../typings'
import { C_000_Linter } from './c_000'
import { C_001_Linter } from './c_001'
import { C_002_Linter } from './c_002'
import { E_000_Linter } from './e_000'
import * as speed from './speed'
import { IssueLinter } from './typings'

const allLinters: IssueLinter<IssueCode>[] = [C_000_Linter, C_001_Linter, C_002_Linter, E_000_Linter]

const DEFAULT_OPTS: LintingOptions = {
  minSpeed: 'slow',
  progressCallback: () => {}
}

export const lintingPipeline = async (ts: TrainInput, tools: Tools, opts: Partial<LintingOptions> = {}) => {
  const options = { ...DEFAULT_OPTS, ...opts }

  let allIssues: DatasetIssue<IssueCode>[] = []
  let idx = 0

  const targetLinters = allLinters.filter((c) => speed.is(c.speed).asFastAs(options.minSpeed))

  for (const linter of targetLinters) {
    const issues = await linter.lint(ts, tools)
    await options.progressCallback(++idx, targetLinters.length, issues)
    allIssues = [...allIssues, ...issues]
  }

  return allIssues
}
