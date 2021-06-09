declare namespace NodeJS {
  export interface Process {
    APP_DATA_PATH: string
    PROXY?: string
    PROJECT_LOCATION: string
    pkg: any
  }

  export interface Global {
    DEBUG: IDebug
    printLog(args: any[]): void
  }
}

declare var process: NodeJS.Process
declare var global: NodeJS.Global

interface IDebugInstance {
  readonly enabled: boolean

  (msg: string, extra?: any): void
  sub(namespace: string): IDebugInstance
}

interface IDebug {
  (module: string, botId?: string): IDebugInstance
}

declare var DEBUG: IDebug
