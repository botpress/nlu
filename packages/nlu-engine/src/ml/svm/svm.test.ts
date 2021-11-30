import { Logger } from 'src/typings'
import { MLToolkit } from '../typings'
import { Predictor, Trainer } from '.'

const SEED = 42

/**
 * WARNING:
 *  If test fails it may be because of your Linux distribution.
 *  Try editing 'jest-before.ts' file your distribution.
 */
describe('SVM', () => {
  test('Trainer should work with basic problems', async () => {
    // prettier-ignore
    const line: MLToolkit.SVM.DataPoint[] = [
      { coordinates: [0, 0], label: 'A' },
      { coordinates: [0, 1], label: 'A' },
      { coordinates: [1, 0], label: 'B' },
      { coordinates: [1, 1], label: 'B' }
    ]

    const dummyLogger: Partial<Logger> = { debug: () => {} }
    const trainer = new Trainer(dummyLogger as Logger)
    const mod = await trainer.train(line, { classifier: 'C_SVC', kernel: 'LINEAR', c: 1, seed: SEED })

    const predictor = new Predictor(mod)
    await predictor.initialize()

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
    // prettier-ignore
    const line: MLToolkit.SVM.DataPoint[] = [
      { coordinates: [0, 0, 0], label: 'A' },
      { coordinates: [0, 1], label: 'A' },
      { coordinates: [1, 0], label: 'B' },
      { coordinates: [1, 1], label: 'B' }
    ]

    const dummyLogger: Partial<Logger> = { debug: () => {} }
    const trainer = new Trainer(dummyLogger as Logger)

    let errorThrown = false
    try {
      await trainer.train(line, { classifier: 'C_SVC', kernel: 'LINEAR', c: [1], seed: SEED })
    } catch (err) {
      errorThrown = true
    }

    expect(errorThrown).toBeTruthy()
  })
})
