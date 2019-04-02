const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const Bottleneck = require('bottleneck')
const request = require('request')

const dataDirectory = path.join(__dirname, '..', 'data')
const audioCacheDirectory = path.join(dataDirectory, 'esv_cache')
const sweepAgeDays = process.env.SWEEP_AGE_DAYS || 2

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
async function downloadAndProcessAudio (apiKey, passage) {
  const chapterId = passage.toLowerCase().replace(/[^a-z0-9]+/g, '_')

  const chapterFile = path.join(audioCacheDirectory, chapterId) + '.mp3'
  const refFile = chapterFile.replace('.mp3', '_ref.wav')
  const videoFile = chapterFile.replace('.mp3', '.webm')

  await promisify(fs.mkdir)(audioCacheDirectory).catch(() => null)

  await Promise.all([
    sayReference(passage, refFile),
    await downloadQueue.schedule(() => downloadChapterAudio(apiKey, passage, chapterFile))
  ])

  return skipIfExists(videoFile, () => transcodeAudioToVideo([refFile, chapterFile], videoFile))
}

function downloadChapterAudio (apiKey, chapter, chapterFile) {
  const url = `https://api.esv.org/v3/passage/audio/?q=${encodeURIComponent(chapter)}`

  return promisify(fs.exists)(chapterFile)
    .then(exists => {
      if (exists) return chapterFile

      console.log('getting chapter from ESV:', chapter)

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
    })
    .then(() => chapterFile)
}

function transcodeAudioToVideo (files, outFile) {
  const tmpFile = outFile.replace('.', '_tmp.')
  const concatConfig = files.map((f, idx) => `[${idx}:0]`).join('') +
    `concat=n=${files.length}:v=0:a=1[out]`
  const cmd1 = [
    '-y',
    ...[].concat(...files.map(f => ['-i', f])),
    '-filter_complex', concatConfig, '-map', '[out]',
    tmpFile]

  const cmd2 = [
    '-y',
    '-i', tmpFile,
    '-f', 'lavfi', '-i', 'color=c=black:s=720x406:r=25:sar=1/1:d=13',
    '-c:a', 'copy',
    outFile]

  return promisify(childProcess.execFile)('ffmpeg', cmd1)
    .then(() => promisify(childProcess.execFile)('ffmpeg', cmd2))
    .then(() => console.log('transcoded to', outFile))
    .then(() => outFile)
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

function skipIfExists (file, fn) {
  return promisify(fs.exists)(file)
    .then(exists => exists ? file : fn())
}

function sweepOldAudio () {
  const minKeepMs = 1 * 60 * 60 * 1000 // for sanity, keep for at least an hour
  const sweepAgeMs = Math.max(sweepAgeDays * 24 * 60 * 60 * 1000, minKeepMs)
  const now = Date.now()

  return promisify(fs.readdir)(audioCacheDirectory)
    .then(files => {
      return Promise.all(files.map(f => {
        const p = path.join(audioCacheDirectory, f)
        return promisify(fs.stat)(p)
          .then(stat => ({ file: p, stat }))
      }))
    })
    .then(fileStats => {
      return Promise.all(fileStats.map(f => {
        const age = now - f.stat.mtimeMs
        const shouldDelete = age > sweepAgeMs

        if (shouldDelete) {
          console.log('deleting', path.basename(f.file))
          return promisify(fs.unlink)(f.file)
        } else return null
      }))
    })
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

  getAudio (config, reference) {
    sweepOldAudio()
      .then(null, e => console.warn('Error in sweeping:', e))
    return downloadAndProcessAudio(config.api_key, reference)
  }
}
