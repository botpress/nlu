declare namespace NodeJS {
  export interface Process {
    pkg: any
  }
}

declare var process: NodeJS.Process
declare var global: NodeJS.Global
