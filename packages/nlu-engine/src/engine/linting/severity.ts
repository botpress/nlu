export type AllSeverities = 'critical' | 'error' | 'warning' | 'info' // use actual IssueSeverity type

const severities: Record<AllSeverities, number> = {
  critical: 0,
  error: 1,
  warning: 2,
  info: 3
}

export const toInt = (severity: AllSeverities): number => {
  return severities[severity]
}

export const is = (severity1: AllSeverities) => ({
  asSevereAs: (severity2: AllSeverities) => {
    return toInt(severity1) <= toInt(severity2)
  }
})
