type Is<X, Y> = X extends Y ? true : false
type And<X extends boolean, Y extends boolean> = X extends false ? false : Y extends false ? false : true

export type UsageSender = 'nlu' // other services might also send usage
export type UsageType = 'training_time' // other services might also send other usage types

export type UsageMetadata<S extends UsageSender, T extends UsageType> = {
  timestamp: string
  sender: S
  type: T
  schema_version: string
}

export type UsageData<S extends UsageSender, T extends UsageType> = And<
  Is<S, 'nlu'>,
  Is<T, 'training_time'>
> extends true
  ? {
      app_id: string
      model_id: string
      training_time: number
      timestamp: string
    }
  : never // other combination of sender + type might have other payload

export type UsagePayload<S extends UsageSender, T extends UsageType> = {
  meta: UsageMetadata<S, T>
  schema_version: string
  records: UsageData<S, T>[]
}
