type Is<X, Y> = X extends Y ? true : false
type And<X extends boolean, Y extends boolean> = X extends false ? false : Y extends false ? false : true

export type BillingUsageSender = 'nlu' // other services might also send usage
export type BillingUsageType = 'training_time' // other services might also send other usage types

export type BillingMetadata<S extends BillingUsageSender, T extends BillingUsageType> = {
  timestamp: string
  sender: S
  type: T
  schema_version: string
}

export type BillingUsageData<S extends BillingUsageSender, T extends BillingUsageType> = And<
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

export type BillingUsage<S extends BillingUsageSender, T extends BillingUsageType> = {
  meta: BillingMetadata<S, T>
  schema_version: string
  records: BillingUsageData<S, T>[]
}
