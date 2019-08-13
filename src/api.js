const express = require('express')
const bodyParser = require('body-parser')

const { generateRss } = require('./feed')
const { getAudioFile } = require('./provider')

module.exports = function startServer (config, providers, dataPath) {
  const app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  app.get('/', async (req, res) => {
    res.send(`
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <h1>Daily Orator.</h1>
    <p>
      TODO
    </p>
  </body>
</html>`)
  })

  app.get('/audio/:provider/:ref(*)', (req, res, next) => {
    const providerId = req.params.provider
    if (!providers[providerId]) {
      res.status(404)
      return
    }

    const reference = req.params.ref
    console.log('GET %s, %s: %s', req.url, providerId, reference)

    const provider = providers[providerId]
    getAudioFile(provider, reference, req.query.prologue === 'true')
      .then(file => res.sendFile(file, { acceptRanges: true }))
      .then(null, e => next(e))
  })

  app.get('/feed', (req, res, next) => {
    generateRss(dataPath)
      .then(result => res.type('xml').send(result))
      .then(null, e => next(e))
  })

  app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ error: err })
  })

  app.listen(3000, function () {
    console.log('Listening on port 3000')
  })
}
