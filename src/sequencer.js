const jodatime = require('js-joda')

function sequencePlaylists (playlists, maxLength) {
  maxLength = jodatime.Duration.ofMinutes(maxLength)

  const filledPlaylists = playlists.map(p => ({
    playOrder: p.playOrder,
    countLimit: orNull(p.constraints.count, Infinity),
    runtimeLimit: jodatime.Duration.ofMinutes(orNull(p.constraints.runtime, 100)),
    tracks: [],
    generator: p.trackSource()
  }))

  // iterate through each playlist and try add at least one non-prologue track

  let totalLength = jodatime.Duration.ZERO
  let addedTracks
  do {
    addedTracks = false

    filledPlaylists.forEach(playlist => {
      const countLimit = playlist.countLimit
      const runtimeLimit = playlist.runtimeLimit || maxLength
      const uncommitted = []

      let hasCommitted = false
      while (true) {
        let { value: track, done } = playlist.generator.next()
        if (done) break
        if (playlist.tracks.length >= countLimit) break
        if (len(playlist.tracks).plus(track.length).compareTo(runtimeLimit) > 0) break
        if (len(uncommitted).plus(track.length).plus(totalLength).compareTo(maxLength) > 0) break

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
        totalLength = totalLength.plus(len(uncommitted))
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
  return tracks.reduce((acc, t) => acc.plus(t.length), jodatime.Duration.ZERO)
}

function orNull (value, def) {
  return value === null || value === undefined ? def : value
}

module.exports = sequencePlaylists
