const sequencePlaylists = require('./sequencer')

function main () {
  const maxLength = 37
  const playlists = [
    { name: 'Greek', playOrder: 1, length: 10, count: 1 },
    { name: 'Gospels', playOrder: 0 },
    { name: 'History', playOrder: 2, length: 12 }
  ]

  // do playlist filtering before sequencing
  const trackList = sequencePlaylists(playlists, maxLength)

  console.log(trackList)
}

function scheduleTracks () {

}

main()
