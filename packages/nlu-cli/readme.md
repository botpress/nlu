# NLU CLI

## Description

Small CLI that serves as an entry point for both the nlu and language server.

## Available commands

### nlu

```
Launch a local stand-alone nlu server

Options:
  --version            Show version number                             [boolean]
  --help               Show help                                       [boolean]
  --config, -c         Path to your config file. If defined, rest of the CLI
                       arguments are ignored.                           [string]
  --port               The port to listen to                     [default: 3200]
  --host               Binds the nlu server to a specific hostname
                                                          [default: "localhost"]
  --dbURL              URL of database where to persist models. If undefined,
                       models are stored on FS.                         [string]
  --modelDir           Directory where to persist models, ignored if dbURL is
                       set.
  --limit              Maximum number of requests per IP per "limitWindow"
                       interval (0 means unlimited)                 [default: 0]
  --limitWindow        Time window on which the limit is applied (use standard
                       notation, ex: 25m or 1h)                  [default: "1h"]
  --languageURL        URL of your language server
                                        [default: "https://lang-01.botpress.io"]
  --languageAuthToken  Authentication token for your language server  [string]
  --apmEnabled         When enabled, Sentry is added to the express server
                       allowing the use of the environment variables SENTRY_DSN,
                       SENTRY_ENVIRONMENT, SENTRY_RELEASE
                                                       [boolean] [default: null]
  --apmSampleRate      If apm is configured, this option sets the sample rate of
                       traces                              [number] [default: 1]
  --ducklingURL        URL of your Duckling server; Only relevant if
                       "ducklingEnabled" is true
                                       [default: "https://duckling.botpress.io"]
  --ducklingEnabled    Whether or not to enable Duckling
                                                       [boolean] [default: true]
  --bodySize           Allowed size of HTTP requests body     [default: "250kb"]
  --batchSize          Allowed number of text inputs in one call to POST
                       /predict                                    [default: -1]
  --modelCacheSize     Max allocated memory for model cache. Too few memory will
                       result in more access to file system.  [default: "850mb"]
  --verbose            Verbosity level of the logging, integer from 0 to 4. Does
                       not apply to "Launcher" logger.              [default: 3]
  --doc                Whether or not to display documentation on start
                                                       [boolean] [default: true]
  --logFilter          Filter logs by namespace, ex: "--log-filter training:svm
                       api". Namespaces are space separated. Does not apply to
                       "Launcher" logger.                                [array]
  --maxTraining        The max allowed amount of simultaneous trainings on a
                       single instance                     [number] [default: 2]
```

### lang

```
Launch a local language server

Options:
  --version           Show version number                              [boolean]
  --help              Show help                                        [boolean]
  --port              The port to listen to                      [default: 3100]
  --host              Binds the language server to a specific hostname
                                                          [default: "localhost"]
  --langDir           Directory where language embeddings will be saved [string]
  --authToken         When enabled, this token is required for clients to query
                      your language server                              [string]
  --adminToken        This token is required to access the server as admin and
                      manage language.                                  [string]
  --limit             Maximum number of requests per IP per "limitWindow"
                      interval (0 means unlimited)                  [default: 0]
  --limitWindow       Time window on which the limit is applied (use standard
                      notation, ex: 25m or 1h)                   [default: "1h"]
  --metadataLocation  URL of metadata file which lists available languages
                                                                       [default:
    "https://nyc3.digitaloceanspaces.com/botpress-public/embeddings/index.json"]
  --offline           Whether or not the language server has internet access
                                                      [boolean] [default: false]
  --dim               Number of language dimensions provided (25, 100 or 300 at
                      the moment)                                 [default: 100]
  --domain            Name of the domain where those embeddings were trained on.
                                                                 [default: "bp"]
  --verbose           Verbosity level of the logging, integer from 0 to 4. Does
                      not apply to "Launcher" logger.               [default: 3]
  --logFilter         Filter logs by namespace, ex: "--log-filter training:svm
                      api". Namespaces are space separated. Does not apply to
                      "Launcher" logger.                                 [array]
```

### download

```
Download a language model for lang and dim

Options:
  --version           Show version number                              [boolean]
  --help              Show help                                        [boolean]
  --langDir           Directory where language embeddings will be saved [string]
  --metadataLocation  URL of metadata file which lists available languages
                                                                       [default:
    "https://nyc3.digitaloceanspaces.com/botpress-public/embeddings/index.json"]
  --dim               Number of language dimensions provided (25, 100 or 300 at
                      the moment)                                 [default: 100]
  --domain            Name of the domain where those embeddings were trained on.
                                                                 [default: "bp"]
  --lang, -l          Language Code to download model from   [string] [required]
```

## Licensing

This software is protected by the same license as the [main Botpress repository](https://github.com/botpress/botpress). You can find the license file [here](https://github.com/botpress/botpress/blob/master/LICENSE).
