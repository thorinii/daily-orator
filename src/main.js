const fsJsonStore = require('fs-json-store')
const path = require('path')
const groupBy = require('lodash/groupBy')

const Cron = require('./cron')
const scheduleTracks = require('./scheduler')
const { getAudioFile, getNextAfter } = require('./provider')
const { addItem } = require('./feed')

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
  cronIntervalMs: 60 * 1000,

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
    console.log('tracklist:')
    console.log(trackList.map(t => `${t.playlist}: [${t.provider}] ${t.ref} ${t.prologue ? '(prologue)' : ''}${t.length.toString()}`))

    await cacheRequiredAudio(providers, trackList)

    await addToFeed(trackList)
    await updatePointers(config.playlists, providers, pointers, trackList)

    console.log('published')
  } catch (e) {
    console.warn('Error scheduling tracks:', e)
  }
}

function cleanCache () {
  console.log('cleaning')
  // TODO: freshen all tracks required by feed
  // TODO: remove items not fresh
}

async function cacheRequiredAudio (providers, tracks) {
  await Promise.all(tracks.map(async track => {
    const provider = providers[track.provider]
    await getAudioFile(provider, track.ref, track.prologue)
  }))
}

async function addToFeed (tracks) {
  for (const track of tracks) {
    const ref = encodeURIComponent(track.ref)
    const url = `audio/${track.provider}/${ref}?prologue=${track.prologue}`
    await addItem(dataPath, url, track.ref + (track.prologue ? ' (prologue)' : ''))
    await delay(2000)
  }
}

async function updatePointers (playlistConfigs, providers, pointers, tracks) {
  const tracksByList = groupBy(tracks, t => t.playlist)
  for (const playlist in tracksByList) {
    const playlistConfig = playlistConfigs[playlist]
    const tracks = tracksByList[playlist].filter(t => !t.prologue)
    const lastTrack = tracks[tracks.length - 1]

    const providerId = lastTrack.provider
    const provider = providers[providerId]

    const nextRef = await getNextAfter(provider, playlistConfig, lastTrack.ref)
    pointers.set(playlist, nextRef)
  }

  await pointers.save()
}

function delay (ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms))
}

main().then(null, e => console.error('crash', e))
