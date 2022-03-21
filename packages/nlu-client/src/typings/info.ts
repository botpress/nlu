export type ServerInfo = {
  specs: Specifications
  languages: string[]
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
