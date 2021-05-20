declare namespace NodeJS {
  export interface Process {
    APP_DATA_PATH: string
    PROXY?: string
    PROJECT_LOCATION: string
    pkg: any
  }
}

declare var process: NodeJS.Process
declare var global: NodeJS.Global
