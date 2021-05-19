declare namespace NodeJS {
  export interface Process {
    /**
     * Path to the global APP DATA folder, shared across all installations of Botpress Server
     * Use this folder to store stuff you'd like to cache, like NLU language models etc
     */
    APP_DATA_PATH: string
    PROXY?: string
    PROJECT_LOCATION: string
    pkg: any
    core_env: BotpressEnvironmentVariables
    /** A random ID generated on server start to identify each server in a cluster */
    SERVER_ID: string
    WEB_WORKER: number
    TRAINING_WORKERS: number[]
  }
}

declare var process: NodeJS.Process
declare var global: NodeJS.Global
