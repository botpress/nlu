import { makeSvm } from '.'

import { AugmentedParameters, NSVM, ProbabilityResult } from './typings'

const train_params = {
  svm_type: 0,
  kernel_type: 2,
  degree: 3,
  gamma: 0.5,
  coef0: 0.0,
  cache_size: 100,
  eps: 0.001,
  C: 1.0,
  nr_weight: 0,
  weight_label: [],
  weight: [],
  nu: 0.5,
  p: 0.0,
  shrinking: true,
  probability: true,
  mute: 1
}

const samples = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1]
]
const labels = [0, 1, 1, 0]

const argmax = (arr: number[]) =>
  arr.reduce((acc, cur, i) => {
    if (cur > arr[acc]) {
      return i
    }
    return acc
  }, 0)

const train_async = async (svm: NSVM, params: AugmentedParameters, x: number[][], y: number[]) => {
  return new Promise<string | void>((resolve, reject) => {
    svm.train_async(params, x, y, (err) => {
      if (err) {
        reject(new Error(err))
      }
      resolve()
    })
  })
}

const predict_async = async (svm: NSVM, x: number[]) => {
  return new Promise<number>((resolve, _) => {
    svm.predict_async(x, (p: number) => {
      resolve(p)
    })
  })
}

const predict_prob_async = async (svm: NSVM, x: number[]) => {
  return new Promise<ProbabilityResult>((resolve, _) => {
    svm.predict_probability_async(x, (p: ProbabilityResult) => {
      resolve(p)
    })
  })
}

test('new model is not trained', async () => {
  const svm = await makeSvm()
  expect(svm.is_trained()).toBeFalsy()
})

test('trained model is trained', async () => {
  const svm = await makeSvm()
  svm.train(train_params, samples, labels)
  expect(svm.is_trained()).toBeTruthy()
})

test('trained model then released is not trained', async () => {
  const svm = await makeSvm()
  svm.train(train_params, samples, labels)
  svm.free_model()
  expect(svm.is_trained()).toBeFalsy()
})

test('svm when set model is trained', async () => {
  const svm = await makeSvm()
  svm.train(train_params, samples, labels)
  const model = svm.get_model()
  svm.free_model()
  svm.set_model(model)
  expect(svm.is_trained()).toBeTruthy()
})

test('svm should predict well', async () => {
  const svm = await makeSvm({ random_seed: 1 })
  svm.train(train_params, samples, labels)
  const predictions: number[] = []
  for (const s of samples) {
    const res = svm.predict(s)
    predictions.push(res)
  }

  const expected = [...labels]
  expect(predictions[0]).toBe(expected[0])
  expect(predictions[1]).toBe(expected[1])
  expect(predictions[2]).toBe(expected[2])
  expect(predictions[3]).toBe(expected[3])
})

test('svm should predict probabilities without exception thrown and output correct format', async () => {
  const svm = await makeSvm()
  svm.train(train_params, samples, labels)
  const predictions: ProbabilityResult[] = []
  for (const s of samples) {
    predictions.push(svm.predict_probability(s))
  }

  for (const p of predictions) {
    expect(p.prediction).toBeDefined()
    expect(p.probabilities).toBeDefined()
    expect(p.probabilities.length).toBe(2)
    expect(p.probabilities[0]).toBeGreaterThanOrEqual(0)
    expect(p.probabilities[0]).toBeLessThanOrEqual(1)

    const complementProb = 1 - p.probabilities[0]
    expect(p.probabilities[1]).toBe(complementProb)
  }
})

test('svm async training still make model trained', async () => {
  const svm = await makeSvm()
  await train_async(svm, train_params, samples, labels)

  expect(svm.is_trained()).toBeTruthy()
})

test('svm async training then free should make model not trained', async () => {
  const svm = await makeSvm()
  await train_async(svm, train_params, samples, labels)

  svm.free_model()

  expect(svm.is_trained()).toBeFalsy()
})

test('svm predict async should still predict well', async () => {
  const svm = await makeSvm()
  svm.train(train_params, samples, labels)

  const predictions: number[] = []
  for (const s of samples) {
    const p = (await predict_async(svm, s)) as number
    predictions.push(p)
  }

  const expected = [...labels]
  expect(predictions[0]).toBe(expected[0])
  expect(predictions[1]).toBe(expected[1])
  expect(predictions[2]).toBe(expected[2])
  expect(predictions[3]).toBe(expected[3])
})

test('svm predict probability async should predict probabilities without exception thrown and output correct format', async () => {
  const svm = await makeSvm()
  await train_async(svm, train_params, samples, labels)

  const predictions: ProbabilityResult[] = []
  for (const s of samples) {
    const p = (await predict_prob_async(svm, s)) as ProbabilityResult
    predictions.push(p)
  }

  for (const p of predictions) {
    expect(p.prediction).toBeDefined()
    expect(p.probabilities).toBeDefined()
    expect(p.probabilities.length).toBe(2)
    expect(p.probabilities[0]).toBeGreaterThanOrEqual(0)
    expect(p.probabilities[0]).toBeLessThanOrEqual(1)

    const complementProb = 1 - p.probabilities[0]
    expect(p.probabilities[1]).toBe(complementProb)
  }
})

test('svm complex transition of training, setting model and releasing should always stay coherent', async () => {
  const svm = await makeSvm()
  expect(svm.is_trained()).toBeFalsy()
  await train_async(svm, train_params, samples, labels)
  expect(svm.is_trained()).toBeTruthy()
  const model = svm.get_model()
  svm.free_model()
  expect(svm.is_trained()).toBeFalsy()
  svm.set_model(model)
  expect(svm.is_trained()).toBeTruthy()
  svm.train(train_params, samples, labels)
  expect(svm.is_trained()).toBeTruthy()
  svm.free_model()
  expect(svm.is_trained()).toBeFalsy()
  await train_async(svm, train_params, samples, labels)
  expect(svm.is_trained()).toBeTruthy()
})

test('svm with bad params type should throw', async () => {
  const bad_params: any = { ...train_params }
  bad_params.degree = {}
  const svm = await makeSvm()

  let error_thrown = false
  const throwing_call = async () => {
    try {
      await train_async(svm, bad_params, samples, labels)
    } catch (e) {
      error_thrown = true
    }
  }
  await throwing_call()

  expect(error_thrown).toBeTruthy()
})

test('svm with bad params domain should throw', async () => {
  const bad_params = { ...train_params }
  bad_params.kernel_type = 69 // hehe ;P
  const svm = await makeSvm()

  let error_thrown = false
  const throwing_call = async () => {
    try {
      await train_async(svm, bad_params, samples, labels)
    } catch (e) {
      error_thrown = true
    }
  }
  await throwing_call()

  expect(error_thrown).toBeTruthy()
})

test('svm training with one class should throw', async () => {
  const bad_labels = [1, 1, 1, 1]
  const svm = await makeSvm()

  let error_thrown = false
  const throwing_call = async () => {
    try {
      await train_async(svm, train_params, samples, bad_labels)
    } catch (e) {
      error_thrown = true
    }
  }
  await throwing_call()

  expect(error_thrown).toBeTruthy()
})

test('svm prediction on a freed model should throw', async () => {
  const svm = await makeSvm()
  await train_async(svm, train_params, samples, labels)
  svm.free_model()

  let error_thrown = false
  const throwing_call = async () => {
    try {
      await predict_async(svm, samples[0])
    } catch (e) {
      error_thrown = true
    }
  }
  await throwing_call()

  expect(error_thrown).toBeTruthy()
})

test('svm getting a freed model should throw', async () => {
  const svm = await makeSvm()
  await train_async(svm, train_params, samples, labels)
  svm.free_model()
  expect(svm.get_model).toThrowError()
})
