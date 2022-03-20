export class ModelTransferError extends Error {
  constructor(public readonly httpCode: number, msg: string) {
    super(msg)
  }
}
