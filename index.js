const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const express = require('express')
const bodyParser = require('body-parser')
const cron = require('node-cron')

const esvProvider = require('./src/esv_provider.js')
const fileProvider = require('./src/file_provider.js')

const dataDirectory = path.join(__dirname, 'data')
const configFile = path.join(dataDirectory, 'config.json')
const historyFile = path.join(dataDirectory, 'history.json')
const defaultUsername = 'lachlan'

const providers = {
  esv: esvProvider,
  file: fileProvider
}

//
// startup logic
//

;(async function () {
  try {
    const config = await loadConfig()
    Object.keys(providers).map(id => {
      providers[id].config = config.providers[id] || {}
    })

    const lists = await Promise.all(config.lists.map(async (listConfig) => {
      const provider = providers[listConfig.provider]
      return {
        name: listConfig.name,
        provider: provider,
        data: await provider.createList(provider.config, listConfig)
      }
    }))

    startServer(config, lists)
    preloadAudios(config, lists)
      .then(null, e => console.warn('Error while preloading:', e))

    startPreloaderCron(config, lists)
  } catch (e) {
    console.error('Crash while starting', e)
  }
})()

function startPreloaderCron (config, lists) {
  cron.schedule('0 * * * *', () => {
    preloadAudios(config, lists)
      .then(null, e => console.warn('Error while preloading:', e))
  })
}

//
// web server
//

function startServer (config, lists) {
  const app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  app.get('/', async (req, res) => {
    const playlist = getPlaylist(lists, await getState(config))

    const entriesJson = JSON.stringify(playlist)
    const agendaHtml = playlist
      .map((entry, idx) => {
        return `
        <div id='entry-${idx}'>${entry.name} - ${entry.reference}</div>`
      })
      .join('\n')

    res.send(`
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <div>
      <div id="currently-playing" style="text-align: center; margin-bottom: 12px; font-size: 2em"></div>
      <video controls style='width: 100%; height: 100px'></video>

      <div style="text-align: center; margin-top: 12px; font-size: 1em">${agendaHtml}</div>
    </div>

    <script>
      var entries = ${entriesJson},
        mediaElement,
        currentlyPlayingEl = document.querySelector('#currently-playing'),
        currentItem = 0;

      function createVideo () {
        mediaElement = document.querySelector('video')
        mediaElement.addEventListener('ended', endedListener);
      }

      function applySrc (entry) {
        currentlyPlayingEl.innerText = entry.name + ' - ' + entry.reference
        mediaElement.src = 'audio?p=' + entry.provider + '&q=' + encodeURIComponent(entry.reference) + '&x=' + Math.random()
        mediaElement.load(); // important on iOS

        try {
          mediaElement.play()
        } catch (e) {
          console.log('cannot autoplay', e)
        }
      }

      function changeVideo (itemId) {
        applySrc(entries[itemId])

        for (var i = 0; i < entries.length; i++) {
          var el = document.querySelector('#entry-' + i)

          var color
          var bold = false

          if (i < itemId) color = '#aaa'
          else if (i === itemId) { color = '#111'; bold = true }
          else color = '#444'

          el.style.color = color
          el.style.fontWeight = bold ? 'bold' : 'initial'
        }
      }

      function endedListener (evt) {
        // TODO: report finished audio
        var entry = entries[currentItem]
        fetch('record-history?list=' + encodeURIComponent(entry.name) + '&reference=' + encodeURIComponent(entry.reference), { method: 'POST' })
          .then(() => console.log('recorded'), e => console.warn('failed to record', e))

        currentItem++;
        if (currentItem >= entries.length) return
        changeVideo(currentItem);
      }

      createVideo()
      changeVideo(0)
    </script>
  </body>
</html>`)
  })

  app.get('/audio', (req, res, next) => {
    const providerId = (req.query.p || '').trim()
    if (!providers[providerId]) {
      res.status(404)
      return
    }

    const reference = (req.query.q || '').trim()
    console.log('GET /audio?p=%s&q=%s', providerId, reference)

    getAudioFile(providerId, reference)
      .then(file => res.sendFile(file, { acceptRanges: false }))
      .then(null, e => next(e))
  })

  app.post('/record-history', (req, res) => {
    appendHistoryRecord(defaultUsername, req.query.list, req.query.reference)
    res.send('')
  })

  app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ error: err })
  })

  app.listen(3000, function () {
    console.log('Started Horner Bible audio system on port 3000')
  })
}

//
// Audio/provider API functions
//

async function getState (config) {
  const entries = await loadHistory(defaultUsername)
  entries.reverse()

  const state = {}
  config.lists.forEach(list => {
    const newest = entries.find(e => e.listName === list.name) || null
    state[list.name] = newest ? newest.reference : null
  })

  return state
}

async function preloadAudios (config, lists) {
  const state = await getState(config)
  const playlist = getPlaylist(lists, state)

  console.log('Preloading:', playlist.map(p => p.provider + '/' + p.reference))

  playlist.forEach(next => {
    return getAudioFile(next.provider, next.reference)
      .catch(e => console.warn('Error in preload of audio:', next, e))
  })
}

class IdempotentQueryThreader {
  constructor () {
    this._requests = new Map()
  }

  thread (key, fn) {
    const existing = this._requests.get(key)
    if (existing) return existing

    const promise = fn()
    this._requests.set(key, promise)

    promise.then(
      () => { this._requests.delete(key) },
      () => { this._requests.delete(key) })

    return promise
  }
}

const queryThreader = new IdempotentQueryThreader()
function getAudioFile (providerId, reference) {
  const provider = providers[providerId]
  const key = providerId + ':' + reference

  return queryThreader.thread(key, () => {
    return provider.getAudio(provider.config, reference)
  })
}

//
// history functions
//

function appendHistoryRecord (username, listName, reference) {
  const entry = JSON.stringify([username, listName, reference, new Date().toISOString()])
  promisify(fs.appendFile)(historyFile, entry + '\n')
    .then(() => {
      console.log('recorded reference %s of list %s', reference, listName)
    })
    .then(null, e => {
      console.warn('failed to record %s %s:', listName, reference, e)
      setTimeout(() => process.exit(1), 500)
    })
}

function loadHistory (username) {
  return promisify(fs.readFile)(historyFile, 'utf8')
    .then(data => {
      return data.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .map(line => {
          const json = JSON.parse(line)
          return {
            username: json[0],
            listName: json[1],
            reference: json[2],
            timestamp: json[3]
          }
        })
        .filter(entry => entry.username === username)
    })
    .then(null, e => {
      if (e.code === 'ENOENT') return []

      console.warn('failed to load history for user %s:', username, e)
      setTimeout(() => process.exit(1), 500)
      return []
    })
}

function loadConfig () {
  return promisify(fs.readFile)(configFile, 'utf8')
    .then(text => {
      return JSON.parse(text)
    })
    .then(null, e => {
      console.warn('failed to load config:', e)
      setTimeout(() => process.exit(1), 500)
      throw e
    })
}

//
// state functions
//

function getPlaylist (lists, state) {
  return lists.map(list => {
    return {
      name: list.name,
      provider: list.provider.name,
      reference: list.provider.getNext(list.data, state[list.name])
    }
  })
}
