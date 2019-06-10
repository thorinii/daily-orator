const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const Bottleneck = require('bottleneck')
const request = require('request')

const { joinAudioFiles } = require('./utils')

const bookChapterCounts = {
  'Genesis': 50,
  'Exodus': 40,
  'Leviticus': 27,
  'Numbers': 36,
  'Deuteronomy': 34,
  'Joshua': 24,
  'Judges': 21,
  'Ruth': 4,
  '1 Samuel': 31,
  '2 Samuel': 24,
  '1 Kings': 22,
  '2 Kings': 25,
  '1 Chronicles': 29,
  '2 Chronicles': 36,
  'Ezra': 10,
  'Nehemiah': 13,
  'Esther': 10,
  'Job': 42,
  'Psalms': 150,
  'Proverbs': 31,
  'Ecclesiastes': 12,
  'Song of Solomon': 8,
  'Isaiah': 66,
  'Jeremiah': 52,
  'Lamentations': 5,
  'Ezekiel': 48,
  'Daniel': 12,
  'Hosea': 14,
  'Joel': 3,
  'Amos': 9,
  'Obadiah': 1,
  'Jonah': 4,
  'Micah': 7,
  'Nahum': 3,
  'Habakkuk': 3,
  'Zephaniah': 3,
  'Haggai': 2,
  'Zechariah': 14,
  'Malachi': 4,
  'Matthew': 28,
  'Mark': 16,
  'Luke': 24,
  'John': 21,
  'Acts': 28,
  'Romans': 16,
  '1 Corinthians': 16,
  '2 Corinthians': 13,
  'Galatians': 6,
  'Ephesians': 6,
  'Philippians': 4,
  'Colossians': 4,
  '1 Thessalonians': 5,
  '2 Thessalonians': 3,
  '1 Timothy': 6,
  '2 Timothy': 4,
  'Titus': 3,
  'Philemon': 1,
  'Hebrews': 13,
  'James': 5,
  '1 Peter': 5,
  '2 Peter': 3,
  '1 John': 5,
  '2 John': 1,
  '3 John': 1,
  'Jude': 1,
  'Revelation': 22
}

function generateChaptersForList (bookNames) {
  return [].concat(...bookNames.map(b => {
    const bookLength = bookChapterCounts[b]
    if (bookLength === 1) return [b]
    else return rangeUntil(bookLength).map(i => b + ' ' + (i + 1))
  }))
}

//
// ESV API functions
//

const downloadQueue = new Bottleneck({
  maxConcurrent: 1
})
async function downloadAndProcessAudio (apiKey, passage, tempSource) {
  const chapterFile = await tempSource.getTemp('mp3')
  const refFile = await tempSource.getTemp('mp3')
  const joinedFile = await tempSource.getTemp('mp3')

  const downloadP = downloadQueue.schedule(() => downloadChapterAudio(apiKey, passage, chapterFile))
  const refP = sayReference(passage, refFile)

  await downloadP
  await refP
  await joinAudioFiles([refFile, chapterFile], joinedFile)

  return joinedFile
}

async function downloadChapterAudio (apiKey, chapter, chapterFile) {
  console.log('downloading', chapter, 'from ESV')

  const url = `https://api.esv.org/v3/passage/audio/?q=${encodeURIComponent(chapter)}`
  return new Promise((resolve, reject) => {
    request({
      url,
      headers: {
        'Authorization': 'Token ' + apiKey
      },
      encoding: null
    })
      .pipe(fs.createWriteStream(chapterFile))
      .on('error', e => reject(e))
      .on('close', () => resolve())
  })
}

function sayReference (chapter, outFile) {
  console.log('saying reference:', chapter)
  const cmd = [
    '-s', '130',
    '-p', '30',
    chapter,
    '-w', outFile]
  return promisify(childProcess.execFile)('espeak', cmd)
    .then(() => outFile)
}

//
// helpers
//

function rangeUntil (count) {
  const array = []
  for (let x = 0; x < count; x++) {
    array.push(x)
  }
  return array
}

module.exports = {
  name: 'esv',

  getTrackRefs (listConfig) {
    return generateChaptersForList(listConfig.books)
  },

  async createList (config, listConfig) {
    return {
      chapters: generateChaptersForList(listConfig.books)
    }
  },

  getNext (list, reference) {
    let chapterIndex = list.chapters.indexOf(reference)
    if (chapterIndex < 0) chapterIndex = -1

    return list.chapters[(chapterIndex + 1) % list.chapters.length]
  },

  getAudioTempFile (config, reference, tempSource) {
    return downloadAndProcessAudio(config.api_key, reference, tempSource)
  }
}
