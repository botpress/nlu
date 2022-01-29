import _ from 'lodash'
import client from 'prom-client'

export const trainingDuration = new client.Histogram({
  name: 'training_duration_seconds',
  help: 'Histogram of training duration in seconds.',
  labelNames: ['status'],
  buckets: [0.1, 0.5, 1, 5, 15, 30, 60]
})

export const modelStorageReadDuration = new client.Histogram({
  name: 'model_storage_read_duration',
  help: 'Histogram of the duration required to read a model from storage in ms.',
  buckets: _.range(1, 11).map((i) => i * 200) // [200, 400, ..., 2000]
})

export const modelMemoryLoadDuration = new client.Histogram({
  name: 'model_memory_load_duration',
  help: 'Histogram of the duration required to load a model in memory in ms.',
  buckets: _.range(1, 11).map((i) => i * 250) // [250, 500, ..., 2500]
})

export const trainingCount = new client.Gauge({
  name: 'training_count',
  help: 'Gauge of all trainings.'
})
