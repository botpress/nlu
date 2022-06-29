import { Domain } from '.'

declare global {
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Matchers<R> {
      toEqualDomain(d: Domain): CustomMatcherResult
      toIntersect(d: Domain): CustomMatcherResult
      toInclude(k: number): CustomMatcherResult
    }
  }
}

const toEqualDomain = (d1: Domain, d2: Domain) => {
  if (d1.isEqual(d2)) {
    return {
      pass: true,
      message: () => `${d1.format()} === ${d2.format()}`
    }
  }

  return {
    pass: false,
    message: () => `${d1.format()} !== ${d2.format()}`
  }
}

const toIntersect = (d1: Domain, d2: Domain) => {
  if (d1.intersects(d2)) {
    return {
      pass: true,
      message: () => `${d1.format()} ∩ ${d2.format()} !== ∅`
    }
  }

  return {
    pass: false,
    message: () => `${d1.format()} ∩ ${d2.format()} === ∅`
  }
}

const toInclude = (d: Domain, k: number) => {
  if (d.includes(k)) {
    return {
      pass: true,
      message: () => `${k} ∈ ${d.format()}`
    }
  }

  return {
    pass: false,
    message: () => `${k} ∉ ${d.format()}`
  }
}

expect.extend({
  toEqualDomain,
  toIntersect,
  toInclude
})
