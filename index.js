const main = require('./src/main')

;(async function () {
  try {
    await main()
  } catch (e) {
    console.error('Fatal crash', e)
  }
})()
