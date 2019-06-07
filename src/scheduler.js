const jodatime = require('js-joda')
const sequencePlaylists = require('./sequencer')

const config = {
  playlists: {
    'Gospels': {
      provider: 'file',
      prologue: '30s',
      trackSource: long
    },
    'Greek': {
      provider: 'esv',
      prologue: false,
      trackSource: short
    },
    'History': {
      provider: 'esv',
      prologue: '30s',
      trackSource: long
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
        length: 12
      }
    }
  ]
}

function main () {
  const now = jodatime.LocalDateTime.now()
  const trackList = scheduleTracks(now, config)
  console.log(trackList)
}

function scheduleTracks (now, config) {
  const maxLength = 37
  const playlists = [
    { name: 'Greek', playOrder: 1, length: 10, count: 1, trackSource: short },
    { name: 'Gospels', playOrder: 0, trackSource: long },
    { name: 'History', playOrder: 2, length: 12, trackSource: long }
  ]

  const globalConstraints = realiseConstraints(now, config.globalConstraints)

  // realise playlists, constraints, and fill orders
  const playlistSequence = config.sequence.map(playlist => {
    return {
      name: playlist.name,
      fillOrder: playlist.fillOrder >= 0 ? playlist.fillOrder : null,
      constraints: realiseConstraints(now, playlist.constraints)
    }
  })
  // set null fill orders
  console.log(playlistSequence)

  // source tracks for maxlength
  // sequence the tracks
  // return tracks

  const trackList = sequencePlaylists(playlists, maxLength)
  return trackList
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

main()
