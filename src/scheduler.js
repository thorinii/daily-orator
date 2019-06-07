const jodatime = require('js-joda')
const zipWith = require('lodash/zipWith')
const sequencePlaylists = require('./sequencer')

const config = {
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
  const now = jodatime.LocalDateTime.now()
  const providers = {
    'esv': {
      sourceTracks: async () => { await delay(400); return long }
    },

    'file': {
      sourceTracks: async () => { await delay(100); return short }
    }
  }

  const trackList = await scheduleTracks(now, config, providers)
  console.log(trackList)
}

async function scheduleTracks (now, config, providers) {
  const globalConstraints = realiseConstraints(now, config.globalConstraints)

  const sequence = realisePlaylists(now, config.sequence)
  await loadTrackGenerators(sequence, providers, globalConstraints.runtime)

  return sequencePlaylists(sequence, globalConstraints.runtime)
}

function realiseConstraints (now, constraints) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const realised = {}

  Object.keys(constraints).filter(k => !daysOfWeek.includes(k)).forEach(key => {
    realised[key] = constraints[key]
  })

  const dayId = daysOfWeek[now.dayOfWeek().ordinal()]
  if (dayId in constraints) {
    const dayConstraints = constraints[dayId]
    Object.keys(dayConstraints).forEach(key => {
      realised[key] = dayConstraints[key]
    })
  }

  Object.keys(realised).forEach(key => {
    if (realised[key] === null) delete realised[key]
  })

  return realised
}

function realisePlaylists (now, playlists) {
  const sequence = config.sequence
    .map((playlist, index) => {
      return {
        name: playlist.name,
        playOrder: index,
        fillOrder: isNaN(playlist.fillOrder) ? null : playlist.fillOrder,
        constraints: realiseConstraints(now, playlist.constraints),
        trackSource: null
      }
    })

  let counter = sequence
    .map(p => p.fillOrder)
    .filter(o => o != null)
    .reduce((a, b) => Math.max(a, b), 0)
  sequence.forEach(p => {
    if (p.fillOrder === null) p.fillOrder = ++counter
  })
  sequence.sort((a, b) => a.fillOrder < b.fillOrder ? -1 : 1)

  return sequence
}

async function loadTrackGenerators (playlists, providers, runtime) {
  const sourcingPromises = playlists.map(playlist => {
    const playlistConfig = config.playlists[playlist.name]
    const provider = providers[playlistConfig.provider]
    return provider.sourceTracks(playlistConfig, runtime)
  })
  zipWith(
    (await Promise.all(sourcingPromises)),
    playlists,
    (generatorFn, playlist) => (playlist.trackSource = generatorFn))
}

function delay (ms) {
  return new Promise((resolve, reject) => setTimeout(() => resolve(), ms))
}

function * short () {
  // dummy implementation
  const trackLength = 3.37

  let index = 0
  while (true) {
    yield { prologue: false, length: trackLength, index, list: 'short' }
    index++
  }
}

function * long () {
  // dummy implementation
  const trackLength = 7.3

  let index = 0

  yield { prologue: true, length: 1.1, index, list: 'long' }
  index++

  while (true) {
    yield { prologue: false, length: trackLength, index, list: 'long' }
    index++
  }
}

main().then(null, e => console.error('crash', e))
