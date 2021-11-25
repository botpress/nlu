import { asYargs } from './yargs-utils'

export const parameters = asYargs({
  langDir: {
    description: 'Directory where language embeddings will be saved',
    type: 'string'
  },
  metadataLocation: {
    description: 'URL of metadata file which lists available languages',
    type: 'string'
  },
  dim: {
    description: 'Number of language dimensions provided (25, 100 or 300 at the moment)',
    type: 'number'
  },
  domain: {
    description: 'Name of the domain where those embeddings were trained on.',
    type: 'string'
  },
  lang: {
    alias: 'l',
    description: 'Language Code to download model from',
    type: 'string',
    demandOption: true
  }
})
