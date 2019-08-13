module.exports = {
  timezone: 'Australia/Adelaide',
  cronIntervalMs: 60 * 1000,

  providers: {
    esv: {
      api_key: '951dadccfb10693cf56fd5604814a65766d84214'
    }
  },

  playlists: {
    'Gospels': {
      provider: 'esv',
      prologue: '30s',
      books: ['Matthew', 'Mark', 'Luke', 'John'],
      repeat: true
    },
    'Greek': {
      provider: 'file',
      prologue: false,
      files: [],
      repeat: true
    },
    'History': {
      provider: 'esv',
      prologue: '30s',
      books: ['Genesis'],
      repeat: true
    }
  },

  globalConstraints: {
    runtime: 40,

    'Sunday': {
      // runtime: 0
    },
    'Saturday': {
      // runtime: 0
    }
  },

  sequence: [
    {
      name: 'Gospels',
      constraints: {
        'Friday': {
          count: 0
        }
      }
    },
    {
      name: 'Greek',
      fillOrder: 0,
      constraints: {
        count: 1,
        'Friday': {
          count: null
        }
      }
    },
    {
      name: 'History',
      constraints: {
        runtime: 17
      }
    }
  ]
}
