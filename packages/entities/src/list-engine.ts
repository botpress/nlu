/**
 * This file contains the essence of the list engine.
 * The current plan is to get rid of lodash and translate it to Rust for speed.
 */

/**
 * #######################
 * ###    0. lodash    ###
 * #######################
 */

const range = (n: number): number[] => {
  const res: number[] = []
  for (let i = 0; i < n; i++) {
    res.push(i)
  }
  return res
}

const every = <T>(arr: ArrayLike<T>, predicate: (x: T) => boolean): boolean => {
  for (let i = 0; i < arr.length; i++) {
    if (!predicate(arr[i])) {
      return false
    }
  }
  return true
}

const some = <T>(arr: ArrayLike<T>, predicate: (x: T) => boolean): boolean => {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) {
      return true
    }
  }
  return false
}

const takeWhile = <T>(arr: T[], predicate: (x: T) => boolean): T[] => {
  const res: T[] = []

  for (const x of arr) {
    if (predicate(x)) {
      res.push(x)
    } else {
      break
    }
  }

  return res
}

const intersection = <T>(arr1: T[], arr2: T[]): T[] => {
  const res: T[] = []
  for (const x of arr1) {
    if (arr2.includes(x)) {
      res.push(x)
    }
  }
  return res
}

const union = <T>(arr1: T[], arr2: T[]): T[] => {
  const res: T[] = []
  for (const x of arr1) {
    if (!res.includes(x)) {
      res.push(x)
    }
  }
  for (const x of arr2) {
    if (!res.includes(x)) {
      res.push(x)
    }
  }
  return res
}

const mean = (arr: number[]): number => {
  let sum = 0
  for (const x of arr) {
    sum += x
  }
  return sum / arr.length
}

const sumBy = <T>(arr: T[], f: (x: T) => number): number => {
  let sum = 0
  for (const x of arr) {
    sum += f(x)
  }
  return sum
}

const orderBy = <T>(arr: T[], f: (x: T) => number, order: 'asc' | 'desc'): T[] => {
  const res = [...arr]
  res.sort((a, b) => {
    const fa = f(a)
    const fb = f(b)
    if (fa < fb) {
      return order === 'asc' ? -1 : 1
    } else if (fa > fb) {
      return order === 'asc' ? 1 : -1
    } else {
      return 0
    }
  })
  return res
}

const uniq = <T>(arr: T[]): T[] => {
  const res: T[] = []
  for (const x of arr) {
    if (!res.includes(x)) {
      res.push(x)
    }
  }
  return res
}

/**
 * ########################
 * ###    1. strings    ###
 * ########################
 */

/**
 * Returns the jaro-winkler similarity between two strings
 * @param s1 String A
 * @param s2 String B
 * @returns A number between 0 and 1, where 1 means very similar
 */
const jaroWinklerSimilarity = (
  s1: string,
  s2: string,
  options: { caseSensitive: boolean } = { caseSensitive: true }
): number => {
  let m = 0

  let i: number
  let j: number

  // Exit early if either are empty.
  if (s1.length === 0 || s2.length === 0) {
    return 0
  }

  // Convert to upper if case-sensitive is false.
  if (!options.caseSensitive) {
    s1 = s1.toUpperCase()
    s2 = s2.toUpperCase()
  }

  // Exit early if they're an exact match.
  if (s1 === s2) {
    return 1
  }

  const range = Math.floor(Math.max(s1.length, s2.length) / 2) - 1
  const s1Matches: boolean[] = new Array(s1.length).fill(false)
  const s2Matches: boolean[] = new Array(s2.length).fill(false)

  for (i = 0; i < s1.length; i++) {
    const low = i >= range ? i - range : 0
    const high = i + range <= s2.length - 1 ? i + range : s2.length - 1

    for (j = low; j <= high; j++) {
      if (s1Matches[i] !== true && s2Matches[j] !== true && s1[i] === s2[j]) {
        ++m
        s1Matches[i] = s2Matches[j] = true
        break
      }
    }
  }

  // Exit early if no matches were found.
  if (m === 0) {
    return 0
  }

  // Count the transpositions.
  let k = 0
  let numTrans = 0

  for (i = 0; i < s1.length; i++) {
    if (s1Matches[i] !== true) {
      continue
    }

    for (j = k; j < s2.length; j++) {
      if (s2Matches[j] === true) {
        k = j + 1
        break
      }
    }

    if (s1[i] !== s2[j]) {
      ++numTrans
    }
  }

  let weight = (m / s1.length + m / s2.length + (m - numTrans / 2) / m) / 3
  let l = 0
  const p = 0.1

  if (weight > 0.7) {
    while (s1[l] === s2[l] && l < 4) {
      ++l
    }

    weight = weight + l * p * (1 - weight)
  }

  return weight
}

/**
 * Returns the levenshtein similarity between two strings
 * sim(a, b) = (|b| - dist(a, b)) / |b| where |a| < |b|
 * sim(a, b) ∈ [0, 1]
 * @returns the proximity between 0 and 1, where 1 is very close
 */
const levenshteinSimilarity = (a: string, b: string): number => {
  const len = Math.max(a.length, b.length)
  const dist = levenshteinDistance(a, b)
  return (len - dist) / len
}

/**
 * Returns the levenshtein distance two strings, i.e. the # of operations required to go from a to b
 * dist(a, b) ∈ [0, max(|a|, |b|)]
 */
const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0 || b.length === 0) {
    return 0
  }

  if (a.length > b.length) {
    const tmp = a
    a = b
    b = tmp
  }

  let i: number,
    j: number,
    res: number = 0

  const alen = a.length
  const blen = b.length
  const row = range(alen + 1)

  let tmp: number
  for (i = 1; i <= blen; i++) {
    res = i
    for (j = 1; j <= alen; j++) {
      tmp = row[j - 1]
      row[j - 1] = res
      res = b[i - 1] === a[j - 1] ? tmp : Math.min(tmp + 1, res + 1, row[j] + 1)
    }
  }

  return res
}

/**
 * #####################
 * ###   2. tokens   ###
 * #####################
 */

type Token = {
  value: string

  isWord: boolean
  isSpace: boolean

  startChar: number
  endChar: number
  startToken: number
  endToken: number
}

const SPECIAL_CHARSET = '¿÷≥≤µ˜∫√≈æ…¬˚˙©+-_!@#$%?&*()/\\[]{}:;<>=.,~`"\''.split('').map((c) => `\\${c}`)
const isWord = (str: string) => every(SPECIAL_CHARSET, (c) => !RegExp(c).test(str)) && !hasSpace(str)
const hasSpace = (str: string) => some(str, isSpace)
const isSpace = (str: string) => every(str, (c) => c === ' ')

const toTokens = (strTokens: string[]): Token[] => {
  const tokens: Token[] = []

  let charIndex = 0

  for (let i = 0; i < strTokens.length; i++) {
    const strToken = strTokens[i]

    const token: Token = {
      value: strToken,

      isWord: isWord(strToken),
      isSpace: isSpace(strToken),

      startChar: charIndex,
      endChar: charIndex + strToken.length,
      startToken: i,
      endToken: i + 1
    }

    tokens.push(token)

    charIndex += strToken.length
  }

  return tokens
}

/**
 * #####################
 * ###   3. parser   ###
 * #####################
 */

const ENTITY_SCORE_THRESHOLD = 0.6

const takeUntil = (arr: Token[], start: number, desiredLength: number): Token[] => {
  let total = 0
  const result = takeWhile(arr.slice(start), (t) => {
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

const computeExactScore = (a: string[], b: string[]): number => {
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

const computeFuzzyScore = (a: string[], b: string[]): number => {
  const str1 = a.join('')
  const str2 = b.join('')
  const d1 = levenshteinSimilarity(str1, str2)
  const d2 = jaroWinklerSimilarity(str1, str2, { caseSensitive: false })
  return (d1 + d2) / 2
}

const computeStructuralScore = (a: string[], b: string[]): number => {
  const charset1 = uniq(a.map((x) => x.split('')).flat())
  const charset2 = uniq(b.map((x) => x.split('')).flat())
  const charset_score = intersection(charset1, charset2).length / union(charset1, charset2).length
  const charsetLow1 = charset1.map((c) => c.toLowerCase())
  const charsetLow2 = charset2.map((c) => c.toLowerCase())
  const charset_low_score = intersection(charsetLow1, charsetLow2).length / union(charsetLow1, charsetLow2).length
  const final_charset_score = mean([charset_score, charset_low_score])

  const la = Math.max(1, a.filter((x) => x.length > 1).length)
  const lb = Math.max(1, a.filter((x) => x.length > 1).length)
  const token_qty_score = Math.min(la, lb) / Math.max(la, lb)

  const size1 = sumBy(a, (x) => x.length)
  const size2 = sumBy(b, (x) => x.length)
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
  char_start: number
  char_end: number
}

export const extractForListModel = (strTokens: string[], listModel: ListEntityModel): ListEntityExtraction[] => {
  const candidates: Candidate[] = []
  let longestCandidate = 0

  const tokens = toTokens(strTokens)

  for (const [canonical, occurrences] of Object.entries(listModel.tokens)) {
    for (const occurrence of occurrences) {
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].isSpace) {
          continue
        }

        const workset = takeUntil(
          tokens,
          i,
          sumBy(occurrence, (o) => o.length)
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
          score: finalScore,
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
      const results = orderBy(
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
      char_start: tokens[match.start].startChar,
      char_end: tokens[match.end].startChar + tokens[match.end].value.length,
      value: match.canonical,
      source: match.source
    }))
  return results
}
