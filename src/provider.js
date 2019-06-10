const path = require('path')
const jodatime = require('js-joda')

const esvProvider = require('./esv_provider')
const {
  TempFileSource,
  FileCache,
  rename,
  getAudioLength } = require('./utils')

const dataPath = path.join(__dirname, '../data')
const audioCachePath = path.join(dataPath, 'cache')
const tmpPath = path.join(dataPath, 'tmp')

const fileCache = new FileCache(audioCachePath, 2)

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

function getAudioFile (provider, providerConfig, ref) {
  const key = provider.name + ':' + ref
  return fileCache.get(key, 'mp3', async (destination) => {
    const tempSource = new TempFileSource(tmpPath)
    const audioPath = await provider.getAudioTempFile(providerConfig, ref, tempSource)
    await rename(audioPath, destination)
    await tempSource.cleanup()
  })
}

;(async function () {
  const listName = 'Letters'
  const provider = esvProvider
  const pointer = 'Ephesians 2'
  const repeat = true
  const runtime = jodatime.Duration.ofMinutes(10)

  if (pointer === null) return

  const refs = await provider.getTrackRefs({
    books: ['Galatians', 'Ephesians']
  })

  const pointerIndex = refs.indexOf(pointer) || 0

  const tracks = []
  let accumulatedRuntime = jodatime.Duration.ZERO
  let index = pointerIndex
  do {
    const ref = refs[index]
    const audioPath = await getAudioFile(
      provider,
      { api_key: '951dadccfb10693cf56fd5604814a65766d84214' },
      ref)

    const length = await getAudioLength(audioPath)
    console.log(ref, 'length:', length.toString())

    tracks.push({
      provider: provider.name,
      list: listName,
      length: length,
      ref
    })
    accumulatedRuntime = accumulatedRuntime.plus(length)

    index++
    if (index >= refs.length) {
      if (repeat) index = 0
      else break
    }
  } while (index !== pointerIndex && accumulatedRuntime.compareTo(runtime) <= 0)

  console.log(index, tracks)
})().then(null, e => console.error('crash', e))
