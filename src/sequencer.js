main()

function main () {
  const playlists = [
    { name: 'Greek', playOrder: 1, length: 10 },
    { name: 'Gospels', playOrder: 0, length: 12 },
    { name: 'History', playOrder: 2, length: 12 }
  ]

  const maxLength = 40

  const filledPlaylists = []
  let totalLength = 0
  playlists
    .forEach(playlist => {
      const tracksGenerator = generateAvailableTracks(playlist, maxLength)

      const availableSpace = Math.min(playlist.length, maxLength - totalLength)
      const committedTracks = fillWithConstraints(tracksGenerator, availableSpace)

      filledPlaylists.push({ tracks: committedTracks, playOrder: playlist.playOrder })
      totalLength += committedTracks.reduce((acc, t) => acc + t.length, 0)
    })

  const trackList = []
  filledPlaylists
    .sort((a, b) => a.playOrder < b.playOrder ? -1 : 1)
    .map(p => p.tracks)
    .forEach(tracks => tracks.forEach(t => trackList.push(t)))

  console.log('track list (length %d):', trackList.reduce((acc, t) => acc + t.length, 0))
  console.log(trackList)
}

function * generateAvailableTracks (playlist) {
  // dummy implementation
  const trackLength = playlist.name === 'Gospels' ? 4 : 2

  let index = 0
  if (playlist.name === 'Gospels') {
    yield { list: playlist.name, length: 2, index, prologue: true }
    index++
  }

  while (true) {
    yield { list: playlist.name, length: trackLength, index, prologue: false }
    index++
  }
}

/**
 * Returns a list of tracks taken from the generator totalling up to the
 * maxLength. If only prologue tracks and no main tracks, this will return an
 * empty list.
 */
function fillWithConstraints (tracksGenerator, maxLength) {
  const list = []
  let hasCommitted = false
  let soFar = 0

  for (const track of tracksGenerator) {
    if (soFar + track.length > maxLength) break

    list.push(track)
    hasCommitted = hasCommitted || !track.prologue
    soFar += track.length
  }

  if (hasCommitted) return list
  else return []
}
