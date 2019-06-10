const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const jodatime = require('js-joda')
const md5 = require('md5')

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

class TempFileSource {
  constructor (dirPath) {
    this._dirPath = dirPath
    this._key = md5(Date.now() + ':' + Math.random())
    this._counter = 0
    this._created = []
  }

  async getTemp (extension) {
    try {
      await promisify(fs.mkdir)(this._dirPath)
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
    }

    const filename = 'tmp_' + this._key + '_' + this._counter + '.' + extension
    this._counter++
    const filePath = path.join(this._dirPath, filename)
    this._created.push(filePath)

    return filePath
  }

  async cleanup () {
    for (const f of this._created) {
      try {
        console.log('deleting', f)
        await promisify(fs.unlink)(f)
      } catch (e) {
        if (e.code !== 'ENOENT') throw e
      }
    }
  }
}

class FileCache {
  constructor (cachePath, expireAfterDays) {
    this._cachePath = cachePath
    this._expireAfterDays = expireAfterDays
    this._queryThreader = new IdempotentQueryThreader()
  }

  async get (key, fileExtension, fn) {
    const hashKey = md5(key)

    return this._queryThreader.thread(hashKey, async () => {
      const sanitisedKey = key.replace(/[^a-zA-Z0-9]+/g, '_')
      const filename = hashKey + '_' + sanitisedKey + '.' + fileExtension
      const filePath = path.join(this._cachePath, filename)

      await this._ensureDir()

      try {
        const now = new Date()
        await promisify(fs.utimes)(filePath, now, now)
        return filePath
      } catch (e) {
        if (e.code !== 'ENOENT') throw e

        await fn(filePath)
        return filePath
      }
    })
  }

  async sweep () {
    const minKeepMs = 1 * 60 * 60 * 1000 // for sanity, keep for at least an hour
    const sweepAgeMs = Math.max(this._expireAfterDays * 24 * 60 * 60 * 1000, minKeepMs)
    const now = Date.now()

    await this._ensureDir()

    return promisify(fs.readdir)(this._cachePath)
      .then(files => {
        return Promise.all(files.map(f => {
          const p = path.join(this._cachePath, f)
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

  async _ensureDir () {
    try {
      await promisify(fs.mkdir)(this._cachePath)
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
    }
  }
}

function transcodeAudioToVideo (inFile, outFile) {
  const cmd = [
    '-y',
    '-i', inFile,
    '-f', 'lavfi', '-i', 'color=c=black:s=720x406:r=25:sar=1/1:d=13',
    // '-c:a', 'copy',
    outFile]

  return promisify(childProcess.execFile)('ffmpeg', cmd)
    .then(() => console.log('transcoded audio to video:', inFile))
    .then(() => outFile)
}

function joinAudioFiles (files, outFile) {
  const concatConfig = files.map((f, idx) => `[${idx}:0]`).join('') +
    `concat=n=${files.length}:v=0:a=1[out]`
  const cmd = [
    '-y',
    ...[].concat(...files.map(f => ['-i', f])),
    '-filter_complex', concatConfig, '-map', '[out]',
    outFile]

  return promisify(childProcess.execFile)('ffmpeg', cmd)
    .then(() => console.log('joined audios:', files))
    .then(() => outFile)
}

function getAudioLength (audioPath) {
  const cmd = [
    '-show_entries', 'stream=duration',
    '-of', 'compact=p=0:nk=1',
    '-v', 'fatal',
    audioPath]

  return promisify(childProcess.execFile)('ffprobe', cmd)
    .then(({ stdout, stderr }) => {
      stdout = stdout.trim()
      const length = parseFloat(stdout)
      if (isNaN(length)) throw new Error('Failed to calculate audio length: ' + audioPath)
      else return jodatime.Duration.ofMillis((length * 1000) | 0)
    })
}

module.exports = {
  IdempotentQueryThreader,
  TempFileSource,
  FileCache,

  rename: (from, to) => promisify(fs.rename)(from, to),

  joinAudioFiles,
  transcodeAudioToVideo,
  getAudioLength
}
