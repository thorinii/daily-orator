const zipWith = require('lodash/zipWith')
const { createTrackGenerator } = require('./provider')
const sequencePlaylists = require('./sequencer')

async function scheduleTracks (now, config, providers, pointers) {
  const globalConstraints = realiseConstraints(now, config.globalConstraints)
  if (globalConstraints.count === 0) return []
  if (globalConstraints.runtime === 0) return []

  const sequence = realisePlaylists(now, config.sequence)
  await loadTrackGenerators(sequence, config.playlists, providers, pointers, globalConstraints.runtime)

  return sequencePlaylists(sequence, globalConstraints.runtime)
}

function realiseConstraints (now, constraints) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const realised = {}

  Object.keys(constraints).filter(k => !daysOfWeek.includes(k)).forEach(key => {
    realised[key] = constraints[key]
  })

  const dayId = daysOfWeek[now.dayOfWeek().ordinal()]
  if (dayId in constraints) {
    const dayConstraints = constraints[dayId]
    Object.keys(dayConstraints).forEach(key => {
      realised[key] = dayConstraints[key]
    })
  }

  Object.keys(realised).forEach(key => {
    if (realised[key] === null) delete realised[key]
  })

  return realised
}

function realisePlaylists (now, playlists) {
  const sequence = playlists
    .map((playlist, index) => {
      return {
        name: playlist.name,
        playOrder: index,
        fillOrder: isNaN(playlist.fillOrder) ? null : playlist.fillOrder,
        constraints: realiseConstraints(now, playlist.constraints),
        trackSource: null
      }
    })

  let counter = sequence
    .map(p => p.fillOrder)
    .filter(o => o != null)
    .reduce((a, b) => Math.max(a, b), 0)
  sequence.forEach(p => {
    if (p.fillOrder === null) p.fillOrder = ++counter
  })
  sequence.sort((a, b) => a.fillOrder < b.fillOrder ? -1 : 1)

  return sequence
}

async function loadTrackGenerators (playlists, playlistConfigs, providers, pointers, runtime) {
  const sourcingPromises = playlists.map(playlist => {
    const playlistConfig = playlistConfigs[playlist.name]
    const provider = providers[playlistConfig.provider]
    const pointer = pointers.get(playlist.name)
    return createTrackGenerator(provider, playlist.name, playlistConfig, runtime, pointer)
  })
  zipWith(
    (await Promise.all(sourcingPromises)),
    playlists,
    (generatorFn, playlist) => (playlist.trackSource = generatorFn))
}

module.exports = scheduleTracks
