import chai from 'chai'
import _ from 'lodash'
import { AssertionArgs, Test } from 'src/typings'
import { assertLintingFinishes, assertLintingStarts } from '../assertions'
import { grocery_dataset } from '../datasets'

const NAME = 'linting'

export const lintingTest: Test = {
  name: NAME,
  handler: async (args: AssertionArgs) => {
    const { logger } = args
    logger.info(`Running test: ${NAME}`)
    const lintingLogger = logger.sub(NAME)
    const lintingArgs = { ...args, logger: lintingLogger }

    const c_000_dataset = _.cloneDeep(grocery_dataset)
    c_000_dataset.intents[0].utterances.push('I love [bananas](some_fruit_lol)')
    const c000_modelId = await assertLintingStarts(lintingArgs, c_000_dataset)
    const c000_issues = await assertLintingFinishes(lintingArgs, c000_modelId)
    chai.expect(c000_issues).to.have.length(1)
    chai.expect(c000_issues[0]).to.have.property('code', 'C_000')

    const c_001_dataset = _.cloneDeep(grocery_dataset)
    c_001_dataset.intents[0].slots.push({ name: 'some-slot', entities: ['non-existent-entity'] })
    const c001_modelId = await assertLintingStarts(lintingArgs, c_001_dataset)
    const c001_issues = await assertLintingFinishes(lintingArgs, c001_modelId)
    chai.expect(c001_issues).to.have.length(1)
    chai.expect(c001_issues[0]).to.have.property('code', 'C_001')

    const e_000_dataset = _.cloneDeep(grocery_dataset)
    e_000_dataset.intents[0].utterances.push('I love [milk](moldy_fruit)')
    const e000_modelId = await assertLintingStarts(lintingArgs, e_000_dataset)
    const e000_issues = await assertLintingFinishes(lintingArgs, e000_modelId)
    chai.expect(e000_issues).to.have.length(1)
    chai.expect(e000_issues[0]).to.have.property('code', 'E_000')
  }
}
