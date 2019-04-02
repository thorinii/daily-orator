const glob = require('glob')
const path = require('path')
const { promisify } = require('util')

const { skipIfExists, transcodeAudioToVideo } = require('./utils')

const dataPath = path.join(__dirname, '..', 'data')
const audioPath = path.join(dataPath, 'file_audio')

module.exports = {
  name: 'file',

  async createList (config, listConfig) {
    const files = await promisify(glob)('**/*.mp3', {
      cwd: audioPath
    })

    return {
      files
    }
  },

  getNext (list, reference) {
    let index = list.files.indexOf(reference)
    if (index < 0) index = -1

    return list.files[(index + 1) % list.files.length]
  },

  async getAudio (config, reference) {
    const originalPath = path.join(audioPath, reference)
    const transcodedPath = originalPath.replace('.mp3', '.webm')
    return skipIfExists(transcodedPath, () => {
      return transcodeAudioToVideo(originalPath, transcodedPath)
    })
  }
}
