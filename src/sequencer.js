function sequencePlaylists (playlists, maxLength) {
  const filledPlaylists = playlists.map(p => ({
    playOrder: p.playOrder,
    countLimit: p.constraints.count || Infinity,
    runtimeLimit: p.constraints.runtime || Infinity,
    tracks: [],
    generator: p.trackSource()
  }))

  // iterate through each playlist and try add at least one non-prologue track

  let totalLength = 0
  let addedTracks
  do {
    addedTracks = false

    filledPlaylists.forEach(playlist => {
      const countLimit = playlist.countLimit
      const runtimeLimit = playlist.runtimeLimit
      const uncommitted = []

      let hasCommitted = false
      while (true) {
        let { value: track, done } = playlist.generator.next()
        if (done) break
        if (playlist.tracks.length >= countLimit) break
        if (len(playlist.tracks) + track.length > runtimeLimit) break
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

function len (tracks) {
  return tracks.reduce((acc, t) => acc + t.length, 0)
}

module.exports = sequencePlaylists
