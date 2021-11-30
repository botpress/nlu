import client from 'prom-client'

export const trainingDuration = new client.Histogram({
  name: 'training_duration_seconds',
  help: 'Histogram of training duration in seconds.',
  labelNames: ['status'],
  buckets: [0.1, 0.5, 1, 5, 15, 30, 60]
})

export const trainingCount = new client.Gauge({
  name: 'training_count',
  help: 'Gauge of all trainings.'
})
