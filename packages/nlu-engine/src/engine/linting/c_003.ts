import _ from 'lodash'
import { TrainInput } from 'src/typings'
import { IssueData, IssueDefinition } from '../../linting'
import { Tools } from '../typings'
import { computeId } from './id'
import { asCode, IssueLinter } from './typings'

const code = asCode('C_003')

export const C_003: IssueDefinition<typeof code> = {
  code,
  severity: 'critical',
  name: 'dataset_has_unsupported_language'
}

export const C_003_Linter: IssueLinter<typeof code> = {
  ...C_003,
  speed: 'fastest',
  lint: async (ts: TrainInput, tools: Tools) => {
    if (tools.getLanguages().includes(ts.language)) {
      return []
    }

    const data: IssueData<typeof code> = {
      language: ts.language
    }

    return [
      {
        ...C_003,
        id: computeId(code, data),
        message: `language "${ts.language}" is not supported by language server.`,
        data
      }
    ]
  }
}
