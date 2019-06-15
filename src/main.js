const fsJsonStore = require('fs-json-store')
const groupBy = require('lodash/groupBy')
const jodatime = require('js-joda')
const path = require('path')

const Cron = require('./cron')
const scheduleTracks = require('./scheduler')
const { getAudioFile, getNextAfter } = require('./provider')
const { addItem, getDateOfLastItem } = require('./feed')

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

async function main () {
  const config = require(path.join(dataPath, 'config.js'))

  const providers = {
    'esv': {
      impl: require('./esv_provider'),
      config: config.providers.esv || {}
    },

    'file': {
      impl: require('./file_provider'),
      config: config.providers.file || {}
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
  const todayStart = now.truncatedTo(jodatime.ChronoUnit.DAYS).toInstant()
  const lastItemTimestamp = await getDateOfLastItem(dataPath)
  if (lastItemTimestamp && lastItemTimestamp.isAfter(todayStart)) return

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
