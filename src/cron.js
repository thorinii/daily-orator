const jodatime = require('js-joda')
require('js-joda-timezone')

class Cron {
  constructor (tz, cronInterval) {
    this.tz = tz
    this.cronInterval = cronInterval
    this.fns = []
    this.intervalId = null
  }

  schedule (fn) {
    this.fns.push({ fn })
    return this
  }

  start () {
    if (this.intervalId !== null) return

    this.intervalId = setInterval(() => {
      this._tick()
    }, this.cronInterval)

    setTimeout(() => this._tick())
  }

  async _tick () {
    const now = jodatime.ZonedDateTime.now(this.tz)

    for (const fn of this.fns) {
      try {
        await fn.fn(now)
      } catch (e) {
        console.warn('Failed to execute cron function:', e)
      }
    }
  }

  static localZone () {
    return jodatime.ZoneId.systemDefault()
  }

  static zoneId (id) {
    return jodatime.ZoneId.of(id)
  }
}

module.exports = Cron
