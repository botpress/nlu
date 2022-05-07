import path from 'path'

const isDrive = (drive: string) => /^[A-Z]:$/.test(drive)

export const toUnix = (filePath: string) => {
  const parts = filePath.split(path.win32.sep)
  if (isDrive(parts[0])) {
    parts[0] = ''
  }
  return parts.join(path.posix.sep)
}
