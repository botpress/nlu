import { IntentDefinition, TrainInput } from '@botpress/nlu-client'
import chai from 'chai'
import _ from 'lodash'
import { AssertionArgs, Test } from 'src/typings'
import { assertLintingFinishes, assertLintingStarts } from '../assertions'
import { grocery_dataset } from '../datasets'

const NAME = 'linting'

const getIntent = (ts: TrainInput, name: string): IntentDefinition => {
  const intent = ts.intents.find((i) => i.name === name)
  if (!intent) {
    throw new Error(`Intent "${name}" does not exist.`)
  }
  return intent
}

export const lintingTest: Test = {
  name: NAME,
  handler: async (args: AssertionArgs) => {
    const { logger } = args
    logger.info(`Running test: ${NAME}`)
    const lintingLogger = logger.sub(NAME)
    const lintingArgs = { ...args, logger: lintingLogger }

    const c_000_dataset = _.cloneDeep(grocery_dataset)
    getIntent(c_000_dataset, 'fruit-is-moldy').utterances.push('I love [bananas](some_fruit_lol)')
    const c000_modelId = await assertLintingStarts(lintingArgs, c_000_dataset)
    const c000_issues = await assertLintingFinishes(lintingArgs, c000_modelId)
    chai.expect(c000_issues).to.have.length(1, 'c000 issue count is incorrect')
    chai.expect(c000_issues[0]).to.have.property('code', 'C_000')

    const c_001_dataset = _.cloneDeep(grocery_dataset)
    getIntent(c_001_dataset, 'fruit-is-moldy').slots.push({ name: 'some-slot', entities: ['non-existent-entity'] })
    const c001_modelId = await assertLintingStarts(lintingArgs, c_001_dataset)
    const c001_issues = await assertLintingFinishes(lintingArgs, c001_modelId)
    chai.expect(c001_issues).to.have.length(1, 'c001 issue count is incorrect')
    chai.expect(c001_issues[0]).to.have.property('code', 'C_001')

    const e_000_dataset = _.cloneDeep(grocery_dataset)
    getIntent(e_000_dataset, 'fruit-is-moldy').utterances.push('I love [milk](moldy_fruit)')
    getIntent(e_000_dataset, 'talk-to-manager').utterances.push(
      'Can I talk with your boss [in Quebec city](appointment_time)?'
    )
    const e000_modelId = await assertLintingStarts(lintingArgs, e_000_dataset)
    const e000_issues = await assertLintingFinishes(lintingArgs, e000_modelId)
    chai.expect(e000_issues).to.have.length(2, 'e000 issue count is incorrect')
    chai.expect(e000_issues[0]).to.have.property('code', 'E_000')
    chai.expect(e000_issues[0].data).to.have.property('source', 'milk')
    chai.expect(e000_issues[1]).to.have.property('code', 'E_000')
    chai.expect(e000_issues[1].data).to.have.property('source', 'in Quebec city')
  }
}
