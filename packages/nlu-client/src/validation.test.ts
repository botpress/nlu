import { validateResponse } from './validation'
import { SuccessReponse, ErrorResponse, NLUError } from './typings/http'

const augmentWithExtraKey = (res: Object) => {
  return [
    { ...res, someExtraKey: undefined },
    { ...res, someExtraKey: null },
    { ...res, someExtraKey: '' },
    { ...res, someExtraKey: 'a value' },
    { ...res, someExtraKey: 69 },
    { ...res, someExtraKey: { key1: 69, key2: '42' } },
    { ...res, someExtraKey: [{ key1: 69, key2: '42' }, 666] }
  ]
}

const error: NLUError = { code: 500, type: 'unknown', message: 'An error' }

test('validating with absent success key should fail', async () => {
  // arrange && act && assert
  expect(() => validateResponse({})).toThrow()
  expect(() => validateResponse({ someKey: 'some text' })).toThrow()
})

test('validating a successfull response should pass', async () => {
  // arrange
  const res: SuccessReponse = { success: true }

  // act && assert
  expect(() => validateResponse(res)).not.toThrow()
})

test('validating an unsuccessfull response with unempty error should pass', async () => {
  // arrange
  const res: ErrorResponse = { success: false, error }

  // act && assert
  expect(() => validateResponse(res)).not.toThrow()
})

test('validating an unsuccessfull response with empty error message should pass', async () => {
  const error: NLUError = { message: '', code: 500, type: 'unknown' }

  // arrange
  const res: ErrorResponse = { success: false, error }

  // act && assert
  expect(() => validateResponse(res)).not.toThrow()
})

test('validating an unsuccessfull response with empty error should fail', async () => {
  // arrange
  const res: ErrorResponse = { success: false, error: {} as NLUError }

  // act && assert
  expect(() => validateResponse(res)).toThrow()
})

test('validating an unsuccessfull response with undefined error should fail', async () => {
  // arrange
  const res: Partial<ErrorResponse> = { success: false }

  // act && assert
  expect(() => validateResponse(res)).toThrow()
})

test('validating a successfull response with unknown keys should pass', async () => {
  // arrange
  const res = <SuccessReponse>{ success: true }

  // act && assert
  const responses = augmentWithExtraKey(res)
  responses.forEach((r) => {
    expect(() => validateResponse(r)).not.toThrow()
  })
})

test('validating an unsuccessfull response with unknown keys should pass', async () => {
  // arrange
  const res = <ErrorResponse>{ success: false, error }

  // act && assert
  const responses = augmentWithExtraKey(res)
  responses.forEach((r) => {
    expect(() => validateResponse(r)).not.toThrow()
  })
})
