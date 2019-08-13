const path = require('path')
const { URL } = require('url')

const fsJsonStore = require('fs-json-store')
const jodatime = require('js-joda')
const RSS = require('rss')
const md5 = require('md5')

const FEED_NAME = process.env.FEED_NAME || 'Daily Orator'
const FEED_SITE_URL = process.env.FEED_URL || 'http://localhost:3000/'
const MAX_ITEMS = process.env.FEED_LENGTH || 100
const MIN_RSS_GAP = jodatime.Duration.ofMinutes(process.env.MIN_RSS_GAP_MINUTES || 2)

async function generateRss (dataPath) {
  const feedItems = await readFeed(dataPath)

  const feed = new RSS({
    title: FEED_NAME,
    description: 'The Daily Orator, a systematic oratory journey through texts.',
    generator: 'Daily Orator',
    feed_url: new URL('feed', FEED_SITE_URL).toString(),
    site_url: FEED_SITE_URL,
    language: 'en',
    ttl: 1 * 60 // minutes
  })

  feedItems.forEach(item => {
    const guid = md5(item.url + item.timestamp)

    const url = new URL(item.url, FEED_SITE_URL)
    url.searchParams.set('unique', guid)

    feed.item({
      title: item.title,
      description: item.title + ' (' + item.url + ')',
      url: url.toString(),
      guid,
      date: item.timestamp,
      enclosure: {
        url: url.toString(),
        type: 'audio/mpeg'
      }
    })
  })

  return feed.xml({ indent: true })
}

async function readFeed (dataPath) {
  const store = makeStore(dataPath)
  return (await store.read()) || []
}

async function addItem (dataPath, url, title) {
  const now = jodatime.Instant.now()
  const lastItemTimestamp = await getDateOfLastItem(dataPath)
  const minTimestamp = lastItemTimestamp === null ? now : lastItemTimestamp.plus(MIN_RSS_GAP)

  const item = {
    timestamp: minTimestamp.isBefore(now) ? now : minTimestamp,
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
