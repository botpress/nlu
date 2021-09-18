import { validateResponse } from './validation'
import { SuccessReponse, ErrorResponse } from './typings/http'

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
  const res: ErrorResponse = { success: false, error: 'an error' }

  // act && assert
  expect(() => validateResponse(res)).not.toThrow()
})

test('validating an unsuccessfull response with empty error should still pass', async () => {
  // arrange
  const res: ErrorResponse = { success: false, error: '' }

  // act && assert
  expect(() => validateResponse(res)).not.toThrow()
})

test('validating an unsuccessfull response with undefined error should fail', async () => {
  // arrange
  const res: Partial<ErrorResponse> = { success: false }

  // act && assert
  expect(() => validateResponse(res)).toThrow()
})

test('validating a successfull response with unknown keys should pass', async () => {
  // arrange
  const res = <SuccessReponse>{ success: true, someExtraKey: 'hellooooo' }

  // act && assert
  expect(() => validateResponse(res)).not.toThrow()
})

test('validating an unsuccessfull response with unknown keys should pass', async () => {
  // arrange
  const res = <ErrorResponse>{ success: false, error: 'some error', someExtraKey: 'lololol' }

  // act && assert
  expect(() => validateResponse(res)).not.toThrow()
})
