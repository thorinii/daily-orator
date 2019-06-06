const sequencePlaylists = require('./sequencer')

function main () {
  const maxLength = 37
  const playlists = [
    { name: 'Greek', playOrder: 1, length: 10, count: 1, trackSource: short },
    { name: 'Gospels', playOrder: 0, trackSource: long },
    { name: 'History', playOrder: 2, length: 12, trackSource: long }
  ]

  // do playlist filtering before sequencing
  const trackList = sequencePlaylists(playlists, maxLength)

  console.log(trackList)
}

function scheduleTracks () {

}

function * short () {
  // dummy implementation
  const trackLength = 3.37

  let index = 0
  while (true) {
    yield { prologue: false, length: trackLength, index, list: 'short' }
    index++
  }
}

function * long () {
  // dummy implementation
  const trackLength = 7.3

  let index = 0

  yield { prologue: true, length: 1.1, index, list: 'long' }
  index++

  while (true) {
    yield { prologue: false, length: trackLength, index, list: 'long' }
    index++
  }
}

main()
