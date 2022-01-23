import { AssertionArgs, Test } from 'src/typings'
import { assertLanguageDetectionWorks } from '../assertions'

const NAME = 'lang-detection'

export const langDetectionTest: Test = {
  name: NAME,
  handler: async (args: AssertionArgs) => {
    const { logger } = args
    logger.info(`Running test: ${NAME}`)
    const langDetectionLogger = logger.sub(NAME)
    const langDetectionArgs = { ...args, logger: langDetectionLogger }
    await assertLanguageDetectionWorks(langDetectionArgs, 'I love Botpress', 'en')
    await assertLanguageDetectionWorks(langDetectionArgs, "J'aime Botpress de tout mon coeur", 'fr')
  }
}
