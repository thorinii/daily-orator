const path = require('path')
const { URL } = require('url')

const fsJsonStore = require('fs-json-store')
const RSS = require('rss')
const md5 = require('md5')

const FEED_NAME = process.env.FEED_NAME || 'Daily Orator'
const FEED_SITE_URL = process.env.FEED_URL || 'http://localhost:3000/'

async function generateRss (dataPath) {
  const feedItems = await readFeed(dataPath)

  const feed = new RSS({
    title: FEED_NAME,
    description: 'The Daily Orator, a systematic oratory journey through texts.',
    generator: 'Daily Orator',
    feed_url: new URL('feed', FEED_SITE_URL).toString(),
    site_url: FEED_SITE_URL,
    managingEditor: 'Scheduled by Lachlan Phillips',
    webMaster: 'Lachlan Phillips',
    language: 'en',
    ttl: 1 * 60 // minutes
  })

  feedItems.forEach(item => {
    feed.item({
      title: item.title,
      description: item.title + ' (' + item.url + ')',
      url: item.url,
      guid: md5(item.url + item.timestamp),
      date: item.timestamp,
      enclosure: {
        url: item.url
      }
    })
  })

  return feed.xml({ indent: true })
}

async function readFeed (dataPath) {
  const store = makeStore(dataPath)
  return (await store.read()) || []
}

async function addItem (dataPath, url, title, timestamp = null) {
  const item = {
    timestamp: timestamp || new Date().toISOString(),
    title,
    url
  }

  const feed = await readFeed(dataPath)
  feed.push(item)
  const store = makeStore(dataPath)
  await store.write(feed)
}

function makeStore (dataPath) {
  return new fsJsonStore.Store({
    file: path.join(dataPath, 'feed.json')
  })
}

(async function () {
  const dataPath = path.join(__dirname, '../data')
  console.log('adding item')
  await addItem(dataPath, FEED_SITE_URL + 'audio/thing.mp3', 'A thing')

  console.log('feed', await readFeed(dataPath))
  await addItem(dataPath, FEED_SITE_URL + 'audio/thing2.mp3', 'Another thing')

  console.log('feed', await readFeed(dataPath))

  console.log('feed xml', await generateRss(dataPath))
})().then(null, e => console.log('error', e))

module.exports = {
  readFeed,
  addItem,
  generateRss
}
