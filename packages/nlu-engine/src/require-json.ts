export const requireJSON = <T>(filePath: string): T | undefined => {
  try {
    const fileContent = require(filePath)
    return fileContent
  } catch (err) {}
}
