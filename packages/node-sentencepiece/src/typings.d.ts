export interface Processor {
  loadModel: (modelPath: string) => void
  encode: (inputText: string) => string[]
  decode: (pieces: string[]) => string
}

export const makeProcessor: () => Promise<Processor>
