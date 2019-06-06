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

  schedule: [
    {
      name: 'Gospels',
      fillOrder: 1,
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
      fillOrder: 2,
      constraints: {
        length: 12
      }
    }
  ]
}

function main () {
  const maxLength = 37
  const playlists = [
    { name: 'Greek', playOrder: 1, length: 10, count: 1, trackSource: short },
    { name: 'Gospels', playOrder: 0, trackSource: long },
    { name: 'History', playOrder: 2, length: 12, trackSource: long }
  ]

  // do playlist filtering before sequencing
  const trackList = sequencePlaylists(playlists, maxLength)

  console.log(trackList)
}

function scheduleTracks () {
  // realise global constraints
  // realise playlists and constraints
  // source tracks for maxlength
  // sequence the tracks
  // return tracks
}

function realiseConstraints (now, constraints) {}

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
