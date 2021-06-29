declare namespace NodeJS {
  export interface Process {
    APP_DATA_PATH: string
    PROXY?: string
  }
}

declare var process: NodeJS.Process
declare var global: NodeJS.Global
