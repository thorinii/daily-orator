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

function getAudioFile (provider, providerConfig, ref) {
  const key = provider.name + ':' + ref
  return fileCache.get(key, 'mp3', async (destination) => {
    const tempSource = new TempFileSource(tmpPath)
    const audioPath = await provider.getAudioTempFile(providerConfig, ref, tempSource)
    await rename(audioPath, destination)
    await tempSource.cleanup()
  })
}

async function createTrackGenerator (provider, providerConfig, playlistName, playlistConfig, runtime, pointer) {
  if (pointer === null) return arrayGenerator([])

  const refs = await provider.getTrackRefs(playlistConfig)

  const pointerIndex = refs.indexOf(pointer) || 0

  const tracks = []
  let accumulatedRuntime = jodatime.Duration.ZERO
  let index = pointerIndex
  do {
    const ref = refs[index]

    const audioPath = await getAudioFile(provider, providerConfig, ref)
    const length = await getAudioLength(audioPath)

    tracks.push({
      provider: provider.name,
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

function * arrayGenerator (array) {
  for (const item of array) {
    yield item
  }
}

;(async function () {
  const provider = require('./esv_provider')
  const listName = 'Letters'
  const listConfig = {
    repeat: true,
    books: ['Galatians', 'Ephesians']
  }
  const pointer = 'Ephesians 2'
  const runtime = jodatime.Duration.ofMinutes(10)

  const tracks = await createTrackGenerator(
    provider,
    { api_key: '951dadccfb10693cf56fd5604814a65766d84214' },
    listName, listConfig,
    runtime, pointer)

  console.log([...tracks])
})().then(null, e => console.error('crash', e))

module.exports = {
  createTrackGenerator
}
