/**
 * Approximate typings of Duckling Server response
 */

export type Duckling = DucklingReturn<DucklingDimension>

export type DucklingReturn<D extends DucklingDimension> = {
  start: number
  end: number
  dim: D
  body: string
  value: DucklingValue<D, DucklingType>
}

export type DucklingDimension =
  | 'amountOfMoney'
  | 'distance'
  | 'duration'
  | 'email'
  | 'number'
  | 'ordinal'
  | 'phoneNumber'
  | 'quantity'
  | 'temperature'
  | 'time'
  | 'url'
  | 'volume'

export type DucklingType = 'value' | 'interval'

export type DucklingValue<D extends DucklingDimension, T extends DucklingType> = {
  type: T
} & DucklingValueInfo<D, T>

type DucklingValueInfo<D extends DucklingDimension, T extends DucklingType> = D extends 'duration'
  ? { normalized: ValueUnit }
  : D extends 'time'
  ? DucklingTimeValue<T>
  : D extends 'number'
  ? Value
  : ValueUnit

type DucklingTimeValue<T extends DucklingType> = T extends 'interval'
  ? TimeInterval & { values?: ({ type: 'interval' } & TimeInterval)[] }
  : ValueGrain & { values?: ({ type: 'value' } & ValueGrain)[] }

export type TimeInterval = Partial<{
  from: ValueGrain
  to: ValueGrain
}>

export type ValueGrain = Value & {
  grain: string
}

export type ValueUnit = Value & {
  unit: string
}

export type Value = {
  value: string | number
}
