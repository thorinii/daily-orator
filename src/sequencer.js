main()

function main () {
  const maxLength = 40
  const playlists = [
    { name: 'Greek', playOrder: 1, length: 10 },
    { name: 'Gospels', playOrder: 0 },
    { name: 'History', playOrder: 2, length: 12 }
  ]

  const trackList = sequencePlaylists(playlists, maxLength)

  console.log('track list (length %d):', len(trackList))
  console.log(trackList)
}

function sequencePlaylists (playlists, maxLength) {
  const filledPlaylists = playlists.map(p => ({
    playlist: p,
    playOrder: p.playOrder,
    limit: p.length,
    tracks: [],
    generator: generateAvailableTracks(p)
  }))

  // iterate through each playlist and try add at least one non-prologue track

  let totalLength = 0
  let addedTracks
  do {
    addedTracks = false

    filledPlaylists.forEach(playlist => {
      const limit = playlist.limit || Infinity
      const uncommitted = []

      let hasCommitted = false
      while (true) {
        let { value: track, done } = playlist.generator.next()
        if (done) break
        if (len(playlist.tracks) + track.length > limit) break
        if (len(uncommitted) + track.length + totalLength > maxLength) break

        uncommitted.push(track)

        // only commit to adding any tracks if there's at least one non-prologue
        // track
        if (!track.prologue) {
          hasCommitted = true
          break
        }
      }

      if (hasCommitted) {
        playlist.tracks = [...playlist.tracks, ...uncommitted]
        totalLength += len(uncommitted)
        addedTracks = true
      }
    })
  } while (addedTracks)

  const trackList = []
  filledPlaylists
    .sort((a, b) => a.playOrder < b.playOrder ? -1 : 1)
    .map(p => p.tracks)
    .forEach(tracks => tracks.forEach(t => trackList.push(t)))

  return trackList
}

function * generateAvailableTracks (playlist) {
  // dummy implementation
  const trackLength = playlist.name === 'Gospels' ? 6 : 2

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

function len (tracks) {
  return tracks.reduce((acc, t) => acc + t.length, 0)
}
