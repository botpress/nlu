export type ServerInfo = {
  specs: Specifications
  languages: string[]
  version: string
  modelTransfer: ModelTransferInfo
}

export type ModelTransferInfo =
  | {
      enabled: false
    }
  | {
      enabled: true
      version: string
    }

export type Specifications = {
  engineVersion: string // semver string
  languageServer: {
    dimensions: number
    domain: string
    version: string // semver string
  }
}
