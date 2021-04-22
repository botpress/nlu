import './jest-before'
import rewire from './rewire'

export = async () => {
  global.rewire = rewire
}
