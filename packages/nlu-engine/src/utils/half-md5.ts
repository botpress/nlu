import crypto from 'crypto'

const MD5_NIBBLES_SIZE = 32 // (128 bits/hash / 8 bits/byte) * 2 nibbles/byte === 32 nibbles/hash
export const halfmd5 = (text: string) => {
  return crypto
    .createHash('md5')
    .update(text)
    .digest('hex')
    .slice(MD5_NIBBLES_SIZE / 2)
}
