const jodatime = require('js-joda')
const scheduleTracks = require('./scheduler')

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
