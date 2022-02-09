import { Logger } from 'src/typings'
import { DataPoint, Predictor, Trainer } from '.'

const SEED = 42

const dummyLogger: Partial<Logger> = { debug: () => {} }
const dummyCallback = () => {}

describe('SVM', () => {
  test('Trainer should work with basic problems', async () => {
    const line: DataPoint[] = [
      { coordinates: [0, 0], label: 'A' },
      { coordinates: [0, 1], label: 'A' },
      { coordinates: [1, 0], label: 'B' },
      { coordinates: [1, 1], label: 'B' }
    ]

    const mod = await Trainer.train(
      line,
      { classifier: 'C_SVC', kernel: 'LINEAR', c: 1, seed: SEED },
      dummyLogger as Logger,
      dummyCallback
    )

    const predictor = await Predictor.create(mod)

    const r1 = await predictor.predict([0, 0])
    const r2 = await predictor.predict([1, 1])
    const r3 = await predictor.predict([0, 1])
    const r4 = await predictor.predict([1, 0])

    expect(r1[0].label).toBe('A')
    expect(r2[0].label).toBe('B')
    expect(r3[0].label).toBe('A')
    expect(r4[0].label).toBe('B')
  })

  test('Trainer should throw when vectors have different lengths', async () => {
    const line: DataPoint[] = [
      { coordinates: [0, 0, 0], label: 'A' },
      { coordinates: [0, 1], label: 'A' },
      { coordinates: [1, 0], label: 'B' },
      { coordinates: [1, 1], label: 'B' }
    ]

    let errorThrown = false
    try {
      await Trainer.train(
        line,
        { classifier: 'C_SVC', kernel: 'LINEAR', c: [1], seed: SEED },
        dummyLogger as Logger,
        dummyCallback
      )
    } catch (err) {
      errorThrown = true
    }

    expect(errorThrown).toBeTruthy()
  })
})
