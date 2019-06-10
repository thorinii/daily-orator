const path = require('path')
const jodatime = require('js-joda')

const {
  TempFileSource,
  FileCache,
  rename,
  getAudioLength } = require('./utils')

const dataPath = path.join(__dirname, '../data')
const audioCachePath = path.join(dataPath, 'cache')
const tmpPath = path.join(dataPath, 'tmp')

const fileCache = new FileCache(audioCachePath, 2)

function getAudioFile (provider, ref) {
  const key = provider.impl.name + ':' + ref
  return fileCache.get(key, 'mp3', async (destination) => {
    const tempSource = new TempFileSource(tmpPath)
    const audioPath = await provider.impl.getAudioTempFile(provider.config, ref, tempSource)
    await rename(audioPath, destination)
    await tempSource.cleanup()
  })
}

async function createTrackGenerator (provider, playlistName, playlistConfig, runtime, pointer) {
  if (pointer === null) return arrayGenerator([])
  runtime = jodatime.Duration.ofMinutes(runtime)

  const refs = await provider.impl.getTrackRefs(playlistConfig)
  if (refs.length === 0) return arrayGenerator([])

  const pointerIndex = Math.max(0, refs.indexOf(pointer) || 0)

  const tracks = []
  let accumulatedRuntime = jodatime.Duration.ZERO
  let index = pointerIndex
  do {
    const ref = refs[index]

    const audioPath = await getAudioFile(provider, ref)
    const length = await getAudioLength(audioPath)

    tracks.push({
      provider: provider.impl.name,
      playlist: playlistName,
      prologue: false,
      length: length,
      ref
    })
    accumulatedRuntime = accumulatedRuntime.plus(length)

    index++
    if (index >= refs.length) {
      if (playlistConfig.repeat !== false) index = 0
      else break
    }
  } while (index !== pointerIndex && accumulatedRuntime.compareTo(runtime) <= 0)

  return arrayGenerator(tracks)
}

function arrayGenerator (array) {
  return function * () {
    for (const item of array) {
      yield item
    }
  }
}

module.exports = {
  createTrackGenerator
}
