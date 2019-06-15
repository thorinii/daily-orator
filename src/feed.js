const path = require('path')
const { URL } = require('url')

const fsJsonStore = require('fs-json-store')
const jodatime = require('js-joda')
const RSS = require('rss')
const md5 = require('md5')

const FEED_NAME = process.env.FEED_NAME || 'Daily Orator'
const FEED_SITE_URL = process.env.FEED_URL || 'http://localhost:3000/'
const MAX_ITEMS = process.env.FEED_LENGTH || 100

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
      url: new URL(item.url, FEED_SITE_URL).toString(),
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

  let feed = await readFeed(dataPath)

  feed.push(item)
  if (feed.length > MAX_ITEMS) {
    feed = feed.slice(feed.length - MAX_ITEMS)
  }

  const store = makeStore(dataPath)
  await store.write(feed)
}

async function getDateOfLastItem (dataPath) {
  const feedItems = await readFeed(dataPath)
  if (feedItems.length === 0) return null

  return jodatime.Instant.parse(feedItems.map(i => i.timestamp).sort().reverse()[0])
}

function makeStore (dataPath) {
  return new fsJsonStore.Store({
    file: path.join(dataPath, 'feed.json')
  })
}

module.exports = {
  readFeed,
  addItem,
  getDateOfLastItem,
  generateRss
}
