import { AssertionArgs, assertLanguageDetectionWorks } from '../assertions'

export const runLangDetectionTest = async (args: AssertionArgs) => {
  const { logger } = args
  logger.info('Running language detection test')
  const langDetectionLogger = logger.sub('lang-detection')
  const langDetectionArgs = { ...args, logger: langDetectionLogger }
  await assertLanguageDetectionWorks(langDetectionArgs, 'I love Botpress', 'en')
  await assertLanguageDetectionWorks(langDetectionArgs, "J'aime Botpress de tout mon coeur", 'fr')
}
