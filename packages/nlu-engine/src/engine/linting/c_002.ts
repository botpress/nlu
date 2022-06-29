import _ from 'lodash'
import { TrainInput } from 'src/typings'
import { DatasetIssue, IssueDefinition } from '../../linting'
import { computeId } from './id'
import { asCode, IssueLinter } from './typings'

const code = asCode('C_002')

export const C_002: IssueDefinition<typeof code> = {
  code,
  severity: 'critical',
  name: 'intent_has_no_utterances'
}

export const C_002_Linter: IssueLinter<typeof code> = {
  ...C_002,
  speed: 'fastest',
  lint: async (ts: TrainInput) => {
    const issues: DatasetIssue<typeof code>[] = []

    for (const i of ts.intents) {
      if (!i.utterances.length) {
        const data = {
          intent: i.name
        }

        issues.push({
          ...C_002,
          id: computeId(code, data),
          message: `Intent "${i.name}" has no utterances.`,
          data
        })
      }
    }
    return issues
  }
}
