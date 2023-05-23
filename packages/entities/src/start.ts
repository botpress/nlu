import { ListEntityExtraction, ListEntityModel, extractForListModel } from './list-engine'
import { spaceTokenizer } from './space-tokenizer'

const FuzzyTolerance = {
  Loose: 0.65,
  Medium: 0.8,
  Strict: 1
} as const

const chalk = {
  red: (x: string) => `\x1b[31m${x}\x1b[0m`,
  green: (x: string) => `\x1b[32m${x}\x1b[0m`,
  blue: (x: string) => `\x1b[34m${x}\x1b[0m`,
  yellow: (x: string) => `\x1b[33m${x}\x1b[0m`,
  magenta: (x: string) => `\x1b[35m${x}\x1b[0m`,
  cyan: (x: string) => `\x1b[36m${x}\x1b[0m`,
  redBright: (x: string) => `\x1b[91m${x}\x1b[0m`,
  greenBright: (x: string) => `\x1b[92m${x}\x1b[0m`,
  blueBright: (x: string) => `\x1b[94m${x}\x1b[0m`,
  yellowBright: (x: string) => `\x1b[93m${x}\x1b[0m`,
  magentaBright: (x: string) => `\x1b[95m${x}\x1b[0m`,
  cyanBright: (x: string) => `\x1b[96m${x}\x1b[0m`
}

const T = spaceTokenizer

const list_entities = [
  {
    name: 'fruit',
    fuzzy: FuzzyTolerance.Medium,
    tokens: {
      Blueberry: ['blueberries', 'blueberry', 'blue berries', 'blue berry', 'poisonous blueberry'].map(T),
      Strawberry: ['strawberries', 'strawberry', 'straw berries', 'straw berry'].map(T),
      Raspberry: ['raspberries', 'raspberry', 'rasp berries', 'rasp berry'].map(T),
      Apple: ['apple', 'apples', 'red apple', 'yellow apple'].map(T)
    }
  },
  {
    name: 'company',
    fuzzy: FuzzyTolerance.Medium,
    tokens: {
      Apple: ['Apple', 'Apple Computers', 'Apple Corporation', 'Apple Inc'].map(T)
    }
  },
  {
    name: 'airport',
    fuzzy: FuzzyTolerance.Medium,
    tokens: {
      JFK: ['JFK', 'New-York', 'NYC'].map(T),
      SFO: ['SFO', 'SF', 'San-Francisco'].map(T),
      YQB: ['YQB', 'Quebec', 'Quebec city', 'QUEB'].map(T)
    }
  }
] as const satisfies readonly ListEntityModel[]

const runExtraction = (utt: string, models: ListEntityModel | ListEntityModel[]): void => {
  console.log(chalk.blueBright(`\n\n${utt}`))

  models = Array.isArray(models) ? models : [models]

  const tokens = spaceTokenizer(utt)
  let output: ListEntityExtraction[] = []

  for (const model of models) {
    output.push(...extractForListModel(tokens, model))
  }

  for (const { char_start, char_end, source, confidence } of output) {
    const mapChars = (x: string, c: string) =>
      x
        .split('')
        .map(() => c)
        .join('')

    const before = mapChars(utt.slice(0, char_start), '-')
    const extracted = mapChars(utt.slice(char_start, char_end), '^')
    const after = mapChars(utt.slice(char_end), '-')
    console.log(`${before}${chalk.green(extracted)}${after}`, `(${confidence.toFixed(2)})`)
  }
}

runExtraction('Blueberries are berries that are blue', {
  name: 'fruit',
  fuzzy: 0.8,
  tokens: {
    Blueberry: [['Blueberries'], ['berries']]
  }
})

runExtraction('Blueberries are berries that are blue', list_entities[0])

runExtraction('I want to go to New-York', [
  {
    name: 'state',
    fuzzy: FuzzyTolerance.Medium,
    tokens: {
      NewYork: ['New York'].map(T)
    }
  },
  {
    name: 'city',
    fuzzy: FuzzyTolerance.Medium,

    tokens: {
      NewYork: ['New York'].map(T)
    }
  }
])
