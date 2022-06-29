import { IssueCode, IssueSeverity } from 'src/linting'

const severities: Record<IssueSeverity<IssueCode>, number> = {
  critical: 0,
  error: 1,
  warning: 2,
  info: 3
}

export const toInt = (severity: IssueSeverity<IssueCode>): number => {
  return severities[severity]
}

export const is = (severity1: IssueSeverity<IssueCode>) => ({
  asSevereAs: (severity2: IssueSeverity<IssueCode>) => {
    return toInt(severity1) <= toInt(severity2)
  }
})
