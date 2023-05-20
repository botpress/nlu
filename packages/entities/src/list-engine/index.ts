import _ from 'lodash'
import { jaroWinklerSimilarity, levenshteinSimilarity } from './strings'
import { Token, toTokens } from './token'

const ENTITY_SCORE_THRESHOLD = 0.6

function takeUntil(arr: Token[], start: number, desiredLength: number): Token[] {
  let total = 0
  const result = _.takeWhile(arr.slice(start), (t) => {
    const toAdd = t.value.length
    const current = total
    if (current > 0 && Math.abs(desiredLength - current) < Math.abs(desiredLength - current - toAdd)) {
      // better off as-is
      return false
    } else {
      // we're closed to desired if we add a new token
      total += toAdd
      return current < desiredLength
    }
  })
  if (result[result.length - 1].isSpace) {
    result.pop()
  }
  return result
}

function computeExactScore(a: string[], b: string[]): number {
  const str1 = a.join('')
  const str2 = b.join('')
  const min = Math.min(str1.length, str2.length)
  const max = Math.max(str1.length, str2.length)
  let score = 0
  for (let i = 0; i < min; i++) {
    if (str1[i] === str2[i]) {
      score++
    }
  }
  return score / max
}

function computeFuzzyScore(a: string[], b: string[]): number {
  const str1 = a.join('')
  const str2 = b.join('')
  const d1 = levenshteinSimilarity(str1, str2)
  const d2 = jaroWinklerSimilarity(str1, str2, { caseSensitive: false })
  return (d1 + d2) / 2
}

function computeStructuralScore(a: string[], b: string[]): number {
  const charset1 = _.uniq(_.flatten(a.map((x) => x.split(''))))
  const charset2 = _.uniq(_.flatten(b.map((x) => x.split(''))))
  const charset_score = _.intersection(charset1, charset2).length / _.union(charset1, charset2).length
  const charsetLow1 = charset1.map((c) => c.toLowerCase())
  const charsetLow2 = charset2.map((c) => c.toLowerCase())
  const charset_low_score = _.intersection(charsetLow1, charsetLow2).length / _.union(charsetLow1, charsetLow2).length
  const final_charset_score = _.mean([charset_score, charset_low_score])

  const la = Math.max(1, a.filter((x) => x.length > 1).length)
  const lb = Math.max(1, a.filter((x) => x.length > 1).length)
  const token_qty_score = Math.min(la, lb) / Math.max(la, lb)

  const size1 = _.sumBy(a, 'length')
  const size2 = _.sumBy(b, 'length')
  const token_size_score = Math.min(size1, size2) / Math.max(size1, size2)

  return Math.sqrt(final_charset_score * token_qty_score * token_size_score)
}

type Candidate = {
  score: number
  canonical: string
  start: number
  end: number
  source: string
  occurrence: string
  eliminated: boolean
}

export type ListEntityModel = {
  name: string
  fuzzy: number
  tokens: Record<string, string[][]>
}

export type ListEntityExtraction = {
  name: string
  confidence: number
  value: string
  source: string
  charStart: number
  charEnd: number
}

export function extractForListModel(strTokens: string[], listModel: ListEntityModel): ListEntityExtraction[] {
  const candidates: Candidate[] = []
  let longestCandidate = 0

  const tokens = toTokens(strTokens)

  for (const [canonical, occurrences] of _.toPairs(listModel.tokens)) {
    for (const occurrence of occurrences) {
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].isSpace) {
          continue
        }

        const workset = takeUntil(
          tokens,
          i,
          _.sumBy(occurrence, (o) => o.length)
        )
        const worksetStrLow = workset.map((x) => x.value.toLowerCase())
        const worksetStrWCase = workset.map((x) => x.value)
        const candidateAsString = occurrence.join('')

        if (candidateAsString.length > longestCandidate) {
          longestCandidate = candidateAsString.length
        }

        const exact_score = computeExactScore(worksetStrWCase, occurrence) === 1 ? 1 : 0
        const fuzzy = listModel.fuzzy < 1 && worksetStrLow.join('').length >= 4
        const fuzzy_score = computeFuzzyScore(
          worksetStrLow,
          occurrence.map((t) => t.toLowerCase())
        )
        const fuzzy_factor = fuzzy_score >= listModel.fuzzy ? fuzzy_score : 0
        const structural_score = computeStructuralScore(worksetStrWCase, occurrence)
        const finalScore = fuzzy ? fuzzy_factor * structural_score : exact_score * structural_score

        candidates.push({
          score: _.round(finalScore, 2),
          canonical,
          start: i,
          end: i + workset.length - 1,
          source: workset.map((t) => t.value).join(''),
          occurrence: occurrence.join(''),
          eliminated: false
        })
      }
    }

    for (let i = 0; i < tokens.length; i++) {
      const results = _.orderBy(
        candidates.filter((x) => !x.eliminated && x.start <= i && x.end >= i),
        // we want to favor longer matches (but is obviously less important than score)
        // so we take its length into account (up to the longest candidate)
        (x) => x.score * Math.pow(Math.min(x.source.length, longestCandidate), 1 / 5),
        'desc'
      )
      if (results.length > 1) {
        const [, ...losers] = results
        losers.forEach((x) => (x.eliminated = true))
      }
    }
  }

  const results: ListEntityExtraction[] = candidates
    .filter((x) => !x.eliminated && x.score >= ENTITY_SCORE_THRESHOLD)
    .map((match) => ({
      name: listModel.name,
      confidence: match.score,
      charStart: tokens[match.start].startChar,
      charEnd: tokens[match.end].startChar + tokens[match.end].value.length,
      value: match.canonical,
      source: match.source
    }))
  return results
}
