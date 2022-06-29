export type Override<T extends object, K extends Partial<Record<keyof T, any>>> = Omit<T, keyof K> & K
