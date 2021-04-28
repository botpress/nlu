import * as sdk from 'bitfan/sdk'
import chalk from 'chalk'

export const showSlotsResults: typeof sdk.visualisation.showSlotsResults = async (results: sdk.Result<'slot'>[]) => {
  for (const res of results) {
    logResult(res)
  }
}

const logResult = (res: sdk.Result<'slot'>) => {
  let actual = ''
  const isInsideExpected = _isInside(res.label.map((l) => ({ start: l.start, end: l.end })))
  for (let i = 0; i < res.text.length; i++) {
    const char = isInsideExpected(i) ? 'x' : '-'
    actual += char
  }

  let elected = ''
  const isInsideActual = _isInside(
    res.candidates.map(({ elected }) => ({
      start: elected.start,
      end: elected.end
    }))
  )
  for (let i = 0; i < res.text.length; i++) {
    const char = isInsideActual(i) ? 'x' : '-'
    elected += char
  }

  // eslint-disable-next-line no-console
  console.log('actual:   ' + chalk.blueBright(actual))
  // eslint-disable-next-line no-console
  console.log('text:     ' + res.text)
  // eslint-disable-next-line no-console
  console.log('elected:  ' + chalk.yellowBright(elected))
  // eslint-disable-next-line no-console
  console.log('')
}

const _isInside = (slots: { start: number; end: number }[]) => (i: number) => {
  return slots.some((s) => s.start <= i && s.end > i)
}
