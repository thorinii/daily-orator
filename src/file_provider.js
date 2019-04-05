const glob = require('glob')
const path = require('path')
const { promisify } = require('util')

const { skipIfExists, transcodeAudioToVideo } = require('./utils')

const dataPath = path.join(__dirname, '..', 'data')
const audioPath = path.join(dataPath, 'file_audio')

module.exports = {
  name: 'file',

  async createList (config, listConfig) {
    return {
      files: [].concat(...(await Promise.all(listConfig.files.map(g => {
        return promisify(glob)(g, {
          cwd: audioPath
        })
      }))))
    }
  },

  getNext (list, reference) {
    let index = list.files.indexOf(reference)
    if (index < 0) index = -1

    return list.files[(index + 1) % list.files.length]
  },

  async getAudio (config, reference) {
    const originalPath = path.join(audioPath, reference)
    const transcodedPath = originalPath + '.webm'
    return skipIfExists(transcodedPath, () => {
      return transcodeAudioToVideo(originalPath, transcodedPath)
    })
  }
}
