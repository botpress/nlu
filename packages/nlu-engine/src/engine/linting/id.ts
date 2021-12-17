import { IssueCode, IssueData } from '../../linting'
import { halfmd5 } from '../../utils/half-md5'

export const computeId = <C extends IssueCode>(code: C, data: IssueData<C>): string => {
  const definitionId = code
  const instanceId = halfmd5(JSON.stringify(data))
  return `${definitionId}.${instanceId}`
}
