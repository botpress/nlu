import fse from 'fs-extra'
import path from 'path'

const makeResultsFileName = (testName) => {
  const fileName = `${testName}.json`
  return path.join(__dirname, '..', 'current_scores', fileName)
}

export const updateResults = async (testName, results) => {
  const file = makeResultsFileName(testName)
  const content = JSON.stringify(results, undefined, 2)
  await fse.writeFile(file, content)
}

export const readResults = async (testName) => {
  const file = makeResultsFileName(testName)
  const content = await fse.readFile(file, 'utf8')
  return JSON.parse(content)
}
