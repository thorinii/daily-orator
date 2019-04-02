const childProcess = require('child_process')
const fs = require('fs')
const { promisify } = require('util')

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

function skipIfExists (file, fn) {
  return promisify(fs.exists)(file)
    .then(exists => exists ? file : fn())
}

module.exports = {
  joinAudioFiles,
  transcodeAudioToVideo,
  skipIfExists
}
