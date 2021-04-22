import { EventEmitter } from 'events'

import { Distro } from './utils/getos'

const os = require('os').platform()

if (!process.core_env) {
  process.core_env = process.env as BotpressEnvironmentVariables
}

if (!process.BOTPRESS_EVENTS) {
  process.BOTPRESS_EVENTS = new EventEmitter()
}

process.APP_DATA_PATH = ''

const distribution =
  os !== 'linux'
    ? {
        os,
        codename: '',
        dist: '',
        release: ''
      }
    : {
        os,
        codename: '',
        dist: 'Alpine Linux', // github checks runs on alpine...
        release: '3.11.6'
      }
process.distro = new Distro(distribution)
