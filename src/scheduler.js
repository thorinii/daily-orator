const jodatime = require('js-joda')
const sequencePlaylists = require('./sequencer')

const config = {
  playlists: {
    'Gospels': {
      provider: 'file',
      prologue: '30s'
    },
    'Greek': {
      provider: 'esv',
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
  const globalConstraints = realiseConstraints(now, config.globalConstraints)

  const sequence = realisePlaylists(now, config.sequence)

  // source tracks for maxlength
  // sequence the tracks
  // return tracks

  const trackList = sequencePlaylists(sequence, globalConstraints.runtime)
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

function realisePlaylists (now, playlists) {
  const sequence = config.sequence
    .map((playlist, index) => {
      return {
        name: playlist.name,
        playOrder: index,
        fillOrder: isNaN(playlist.fillOrder) ? null : playlist.fillOrder,
        constraints: realiseConstraints(now, playlist.constraints),
        trackSource: playlist.name === 'Gospels' ? long : short
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
