import { SystemEntityExtractor, EntityExtractionResult } from '../typings'

export class DummySystemEntityExtractor implements SystemEntityExtractor {
  public async extractMultiple(
    input: string[],
    lang: string,
    progress: (p: number) => void,
    useCache?: boolean | undefined
  ): Promise<EntityExtractionResult[][]> {
    return Array(input.length).fill([])
  }

  public async extract(input: string, lang: string): Promise<EntityExtractionResult[]> {
    return []
  }
}
