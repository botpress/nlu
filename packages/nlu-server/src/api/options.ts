export type APIOptions = {
  limitWindow: string
  limit: number
  bodySize: string
  batchSize: number
  tracingEnabled?: boolean
  prometheusEnabled?: boolean
  apmEnabled?: boolean
  apmSampleRate?: number
  usageURL?: string
}
