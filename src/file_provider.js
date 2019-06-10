const fs = require('fs')
const glob = require('glob')
const path = require('path')
const { promisify } = require('util')

const dataPath = path.join(__dirname, '..', 'data')
const audioPath = path.join(dataPath, 'file_audio')

module.exports = {
  name: 'file',

  async getTrackRefs (listConfig) {
    return [].concat(...(await Promise.all(listConfig.files.map(g => {
      return promisify(glob)(g, {
        cwd: audioPath
      })
    }))))
  },

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

  async getAudioTempFile (config, reference, tempSource) {
    const originalPath = path.join(audioPath, reference)
    const parsed = path.parse(originalPath)
    const destination = await tempSource.getTemp(parsed.ext.substring(1))
    await promisify(fs.copyFile)(originalPath, destination)
    return destination
  }
}
