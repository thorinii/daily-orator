const jodatime = require('js-joda')
require('js-joda-timezone')

class Cron {
  constructor (tz, cronInterval) {
    this.tz = tz
    this.cronInterval = cronInterval
    this.fns = []
    this.intervalId = null
  }

  schedule (hour, fn) {
    this.fns.push({ hour, fn, last: null })
    return this
  }

  start () {
    if (this.intervalId !== null) return

    this.intervalId = setInterval(() => {
      this._tick()
    }, this.cronInterval)
  }

  _tick () {
    const now = jodatime.ZonedDateTime.now(this.tz)

    for (const fn of this.fns) {
      if (fn.last !== null && fn.last.dayOfWeek() === now.dayOfWeek()) continue
      if (now.hour() < fn.hour) continue

      try {
        fn.fn()
      } catch (e) {
        console.warn('Failed to execute cron function:', e)
      } finally {
        fn.last = now
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

new Cron(Cron.zoneId('Australia/Adelaide'), 1000)
  .schedule(21, () => console.log('yo'))
  .start()

module.exports = Cron
