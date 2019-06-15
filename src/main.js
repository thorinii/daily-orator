const fsJsonStore = require('fs-json-store')
const path = require('path')

const Cron = require('./cron')
const scheduleTracks = require('./scheduler')

class Pointers {
  static async load (filePath) {
    const store = new fsJsonStore.Store({
      file: filePath
    })
    const map = await store.read() || {}
    return new Pointers(store, map)
  }

  constructor (store, map) {
    this.store = store
    this.map = map
  }

  get (key) {
    return this.map[key] || null
  }

  set (key, value) {
    this.map[key] = value
  }

  async save () {
    await this.store.write(this.map)
  }
}

const dataPath = path.join(__dirname, '../data')
const pointersFilePath = path.join(dataPath, 'pointers.json')

const config = {
  timezone: 'Australia/Adelaide',
  cronIntervalMs: 7000,

  playlists: {
    'Gospels': {
      provider: 'esv',
      prologue: '30s',
      books: ['Matthew', 'Mark', 'Luke', 'John'],
      repeat: true
    },
    'Greek': {
      provider: 'file',
      prologue: false,
      files: [],
      repeat: true
    },
    'History': {
      provider: 'esv',
      prologue: '30s',
      books: ['Genesis'],
      repeat: true
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
        runtime: 17
      }
    }
  ]
}

async function main () {
  // TODO: load config
  const providers = {
    'esv': {
      impl: require('./esv_provider'),
      config: {
        api_key: '951dadccfb10693cf56fd5604814a65766d84214'
      }
    },

    'file': {
      impl: require('./file_provider'),
      config: {}
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
    const pointers = await Pointers.load(pointersFilePath)
    const trackList = await scheduleTracks(now, config, providers, pointers)
    console.log('tracklist:', trackList)

    // TODO: make required audio
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

main().then(null, e => console.error('crash', e))
