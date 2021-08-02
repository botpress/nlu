import { Logger } from '@botpress/nlu-logger'
import chalk from 'chalk'
import { StanOptions } from './config'

const GH_TYPINGS_FILE = 'https://github.com/botpress/nlu/blob/master/packages/nlu/src/typings_v1.d.ts'
const GH_TRAIN_INPUT_EXAMPLE = 'https://github.com/botpress/nlu/blob/master/packages/nlu/src/stan/train-example.json'

export const displayDocumentation = (logger: Logger, options: StanOptions) => {
  const { host, port } = options
  const baseUrl = `http://${host}:${port}/v1`

  logger.info(chalk`

{bold {underline Available Routes}}

{green /**
 * Gets the current version of botpress core NLU. Usefull to test if your installation is working.
 * @returns {bold info}: version, health and supported languages.
*/}
{bold GET ${baseUrl}/info}

{green /**
  * Starts a training.
  * @body_parameter {bold language} Language to use for training.
  * @body_parameter {bold intents} Intents definitions.
  * @body_parameter {bold contexts} All available contexts.
  * @body_parameter {bold entities} Entities definitions.
  * @body_parameter {bold appSecret} Password to protect your model. {yellow ** Optionnal **}
  * @body_parameter {bold appId} To make sure there's no collision between models of different applications. {yellow ** Optionnal **}
  * @body_parameter {bold seed} Number to seed random number generators used during training (beta feature). {yellow ** Optionnal **}
  * @returns {bold modelId} A model id for futur API calls
 */}
{bold POST ${baseUrl}/train}

{green /**
  * Gets a training progress status.
  * @path_parameter {bold modelId} The model id for which you seek the training progress.
  * @query_parameter {bold appSecret} The password protecting your model.
  * @query_parameter {bold appId} The application id your model belongs to.
  * @returns {bold session} A training session data structure with information on desired model.
 */}
{bold GET ${baseUrl}/train/:modelId?appSecret=XXXXXX&appId=XXXXXX}

{green /**
  * List all models for a given app Id and secret.
  * @path_parameter {bold modelId} The model id for which you seek the training progress.
  * @query_parameter {bold appSecret} The password protecting your models.
  * @query_parameter {bold appId} The application id you want to list models for.
  * @returns {bold models} Array of strings model ids available for prediction.
 */}
{bold GET ${baseUrl}/models/:modelId?appSecret=XXXXXX&appId=XXXXXX}

{green /**
  * Cancels a training.
  * @path_parameter {bold modelId} The model id for which you want to cancel the training.
  * @body_parameter {bold appSecret} The password protecting your models.
  * @body_parameter {bold appId} The application id you want to prune models for.
  * @returns {bold models} Array of strings model ids that where pruned.
 */}
{bold POST ${baseUrl}/models/prune}

{green /**
  * Cancels a training.
  * @path_parameter {bold modelId} The model id for which you want to cancel the training.
  * @body_parameter {bold appSecret} The password protecting your model.
  * @body_parameter {bold appId} The application id your model belongs to.
 */}
{bold POST ${baseUrl}/train/:modelId/cancel}

{green /**
  * Perform prediction for a text input.
  * @path_parameter {bold modelId} The model id you want to use for prediction.
  * @body_parameter {bold appSecret} The password protecting your model.
  * @body_parameter {bold appId} The application id your model belongs to.
  * @body_parameter {bold utterances} Array of text for which you want a prediction.
  * @returns {bold predictions} Array of predictions; Each prediction is a data structure reprensenting our understanding of the text.
 */}
{bold POST ${baseUrl}/predict/:modelId}

{green /**
  * Perform prediction for a text input.
  * @path_parameter {bold modelId} The model id you want to use for prediction.
  * @body_parameter {bold appSecret} The password protecting your model.
  * @body_parameter {bold appId} The application id your model belongs to.
  * @body_parameter {bold utterances} Array of text for which you want a prediction.
  * @body_parameter {bold models} Array of strings model ids you want to use to detect language. {yellow ** Optionnal **}
  * @returns {bold detectedLanguages} Array of string language codes.
 */}
{bold POST ${baseUrl}/detect-lang}

{bold For more detailed information on typings, see
${GH_TYPINGS_FILE}}.

{bold For a complete example on training input, see
${GH_TRAIN_INPUT_EXAMPLE}}.

{bold {yellow To hide this documentation, run program with arg --doc=false}}
    `)
}
