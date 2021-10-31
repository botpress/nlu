import { responseValidator } from './validation'
import { SuccessReponse, ErrorResponse, LangError } from './typings'
import { AxiosResponse } from 'axios'

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

const error: LangError = { code: 500, type: 'unknown', message: 'An error' }
const validateResponse = responseValidator({ verb: 'GET', ressource: 'info' })

const axiosRes = (data: any): AxiosResponse<any> => {
  const x: Partial<AxiosResponse<any>> = { data, status: 200 }
  return x as AxiosResponse<any>
}

test('validating with absent success key should fail', async () => {
  // arrange && act && assert
  expect(() => validateResponse(axiosRes({}))).toThrow()
  expect(() => validateResponse(axiosRes({ someKey: 'some text' }))).toThrow()
})

test('validating a successfull response should pass', async () => {
  // arrange
  const res: SuccessReponse = { success: true }

  // act && assert
  expect(() => validateResponse(axiosRes(res))).not.toThrow()
})

test('validating an unsuccessfull response with unempty error should pass', async () => {
  // arrange
  const res: ErrorResponse = { success: false, error }

  // act && assert
  expect(() => validateResponse(axiosRes(res))).not.toThrow()
})

test('validating an unsuccessfull response with empty error message should pass', async () => {
  const error: LangError = { message: '', code: 500, type: 'unknown' }

  // arrange
  const res: ErrorResponse = { success: false, error }

  // act && assert
  expect(() => validateResponse(axiosRes(res))).not.toThrow()
})

test('validating an unsuccessfull response with empty error should fail', async () => {
  // arrange
  const res: ErrorResponse = { success: false, error: {} as LangError }

  // act && assert
  expect(() => validateResponse(axiosRes(res))).toThrow()
})

test('validating an unsuccessfull response with undefined error should fail', async () => {
  // arrange
  const res: Partial<ErrorResponse> = { success: false }

  // act && assert
  expect(() => validateResponse(axiosRes(res))).toThrow()
})

test('validating a successfull response with unknown keys should pass', async () => {
  // arrange
  const res = <SuccessReponse>{ success: true }

  // act && assert
  const responses = augmentWithExtraKey(res)
  responses.forEach((r) => {
    expect(() => validateResponse(axiosRes(r))).not.toThrow()
  })
})

test('validating an unsuccessfull response with unknown keys should pass', async () => {
  // arrange
  const res = <ErrorResponse>{ success: false, error }

  // act && assert
  const responses = augmentWithExtraKey(res)
  responses.forEach((r) => {
    expect(() => validateResponse(axiosRes(r))).not.toThrow()
  })
})
