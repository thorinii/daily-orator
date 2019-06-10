const jodatime = require('js-joda')

const Cron = require('./cron')
const scheduleTracks = require('./scheduler')

const config = {
  timezone: 'Australia/Adelaide',
  cronIntervalMs: 3000,

  playlists: {
    'Gospels': {
      provider: 'esv',
      prologue: '30s'
    },
    'Greek': {
      provider: 'file',
      prologue: false
    },
    'History': {
      provider: 'esv',
      prologue: '30s'
    }
  },

  globalConstraints: {
    runtime: 40,

    'Sunday': {
      runtime: 0
    },
    'Saturday': {
      runtime: 0
    }
  },

  sequence: [
    {
      name: 'Gospels',
      constraints: {
        'Friday': {
          count: 0
        }
      }
    },
    {
      name: 'Greek',
      fillOrder: 0,
      constraints: {
        count: 1,
        'Friday': {
          count: null
        }
      }
    },
    {
      name: 'History',
      constraints: {
        runtime: 12
      }
    }
  ]
}

async function main () {
  // TODO: load config
  const providers = {
    'esv': {
      sourceTracks: async (name) => { await delay(400); return long(name) }
    },

    'file': {
      sourceTracks: async (name) => { await delay(100); return short(name) }
    }
  }

  const cron = new Cron(
    Cron.zoneId(config.timezone),
    config.cronIntervalMs)

  cron.schedule(now => scheduleDayTracklist(config, providers, now))
  cron.schedule(() => cleanCache())
  cron.start()
}

async function scheduleDayTracklist (config, providers, now) {
  // TODO: if a new day since last items in feed

  try {
    console.log('scheduling')
    const trackList = await scheduleTracks(now, config, providers)
    console.log(trackList)

    // TODO: add to RSS
    // TODO: update pointers
  } catch (e) {
    console.warn('Error scheduling tracks:', e)
  }
}

function cleanCache () {
  console.log('cleaning')
  // TODO: freshen all tracks required by feed
  // TODO: remove items not fresh
}

function delay (ms) {
  return new Promise((resolve, reject) => setTimeout(() => resolve(), ms))
}

const short = name => function * short () {
  // dummy implementation
  const trackLength = 3.37

  let index = 0
  while (true) {
    yield { prologue: false, length: trackLength, index, list: name }
    index++
  }
}

const long = name => function * long () {
  // dummy implementation
  const trackLength = 7.3

  let index = 0

  yield { prologue: true, length: 1.1, index, list: name }
  index++

  while (true) {
    yield { prologue: false, length: trackLength, index, list: name }
    index++
  }
}

main().then(null, e => console.error('crash', e))
