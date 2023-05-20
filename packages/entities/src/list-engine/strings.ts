import _ from 'lodash'

/**
 * Returns the jaro-winkler similarity between two strings
 * @param s1 String A
 * @param s2 String B
 * @returns A number between 0 and 1, where 1 means very similar
 */
export function jaroWinklerSimilarity(
  s1: string,
  s2: string,
  options: { caseSensitive: boolean } = { caseSensitive: true }
): number {
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
    if (s1Matches[i] === true) {
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
export function levenshteinSimilarity(a: string, b: string): number {
  const len = Math.max(a.length, b.length)
  const dist = levenshteinDistance(a, b)
  return (len - dist) / len
}

/**
 * Returns the levenshtein distance two strings, i.e. the # of operations required to go from a to b
 * dist(a, b) ∈ [0, max(|a|, |b|)]
 */
export function levenshteinDistance(a: string, b: string): number {
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
  const row = _.range(alen + 1)

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
