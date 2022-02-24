import Bluebird from 'bluebird'
import _ from 'lodash'
import { DatasetIssue, IssueCode } from '../../linting'
import { Logger, TrainInput } from '../../typings'
import { Tools } from '../typings'
import { C_000_Linter } from './c_000'
import { C_001_Linter } from './c_001'
import { C_002_Linter } from './c_002'
import { E_000_Linter } from './e_000'
import * as speed from './speed'
import { IssueLinter, LintingOptions } from './typings'

const allLinters: IssueLinter<IssueCode>[] = [C_000_Linter, C_001_Linter, C_002_Linter, E_000_Linter]

const DEFAULT_OPTS: LintingOptions = {
  minSpeed: 'slow',
  progressCallback: () => {}
}

export const lintingPipeline = async (
  ts: TrainInput,
  tools: Tools & { logger: Logger },
  opts: Partial<LintingOptions> = {}
) => {
  const options = { ...DEFAULT_OPTS, ...opts }

  let idx = 0

  const targetLinters = allLinters.filter((c) => speed.is(c.speed).asFastAs(options.minSpeed))

  // TODO: replace this by Promise.all
  const results = await Bluebird.mapSeries(targetLinters, async (linter) => {
    tools.logger.debug(`Running linter "${linter.name}" started.`)
    const t0 = Date.now()
    const issues = await linter.lint(ts, tools)
    tools.logger.debug(`Running linter "${linter.name}" done (${Date.now() - t0} ms).`)
    await options.progressCallback(++idx, targetLinters.length, issues)
    return issues
  })

  const allIssues: DatasetIssue<IssueCode>[] = _.flatten(results)
  return allIssues
}
