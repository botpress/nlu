export type ServerInfo = {
  specs: Specifications
  languages: string[]
  version: string
  modelTransfer: ModelTransferInfo
}

export type ModelTransferInfo = {
  enabled: boolean
}

export type Specifications = {
  engineVersion: string // semver string
  languageServer: {
    dimensions: number
    domain: string
    version: string // semver string
  }
}
