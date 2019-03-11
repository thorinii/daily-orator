const estimatedAnnualReadingDays = Math.floor(365.25 / 7 * 5)

const bookChapterCounts = {
  "Genesis": 50,
  "Exodus": 40,
  "Leviticus": 27,
  "Numbers": 36,
  "Deuteronomy": 34,
  "Joshua": 24,
  "Judges": 21,
  "Ruth": 4,
  "1 Samuel": 31,
  "2 Samuel": 24,
  "1 Kings": 22,
  "2 Kings": 25,
  "1 Chronicles": 29,
  "2 Chronicles": 36,
  "Ezra": 10,
  "Nehemiah": 13,
  "Esther": 10,
  "Job": 42,
  "Psalms": 150,
  "Proverbs": 31,
  "Ecclesiastes": 12,
  "Song of Solomon": 8,
  "Isaiah": 66,
  "Jeremiah": 52,
  "Lamentations": 5,
  "Ezekiel": 48,
  "Daniel": 12,
  "Hosea": 14,
  "Joel": 3,
  "Amos": 9,
  "Obadiah": 1,
  "Jonah": 4,
  "Micah": 7,
  "Nahum": 3,
  "Habakkuk": 3,
  "Zephaniah": 3,
  "Haggai": 2,
  "Zechariah": 14,
  "Malachi": 4,
  "Matthew": 28,
  "Mark": 16,
  "Luke": 24,
  "John": 21,
  "Acts": 28,
  "Romans": 16,
  "1 Corinthians": 16,
  "2 Corinthians": 13,
  "Galatians": 6,
  "Ephesians": 6,
  "Philippians": 4,
  "Colossians": 4,
  "1 Thessalonians": 5,
  "2 Thessalonians": 3,
  "1 Timothy": 6,
  "2 Timothy": 4,
  "Titus": 3,
  "Philemon": 1,
  "Hebrews": 13,
  "James": 5,
  "1 Peter": 5,
  "2 Peter": 3,
  "1 John": 5,
  "2 John": 1,
  "3 John": 1,
  "Jude": 1,
  "Revelation": 22
}

const rawLists = {
  "Gospels, Revelation":
    ["Matthew", "Mark", "Luke", "John", "Revelation"],
  "Pentateuch":
    ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"],
  "Lesser Wisdom":
    ["Job", "Ecclesiastes", "Song of Solomon", "Lamentations"],
  "NT letters 1":
    ["1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "1 Timothy", "2 Timothy"],
  "Psalms":
    ["Psalms"],
  "OT history":
    ["Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther"],
  "Acts, Romans, Hebrews":
    ["Acts", "Romans", "Hebrews"],
  "OT prophets":
    ["Isaiah", "Jeremiah", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi"],
  "Proverbs":
    ["Proverbs"],
  "NT letters 2":
    ["Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "Titus", "Philemon", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude"]
}


const lists = Object.keys(rawLists).map(name => {
  const books = rawLists[name]
  const chapterSequence = [].concat(...books.map(b => {
    const bookLength = bookChapterCounts[b]
    return rangeUntil(bookLength).map(i => b + ' ' + (i + 1))
  }))
  return {
    name,
    books,
    chapterCount: chapterSequence.length,
    chapterSequence,
    yearFrequency: toD1(estimatedAnnualReadingDays / chapterSequence.length)
  }
})

const state = lists.map(l => ({ name: l.name, index: 0, playSequenceClock: null }))

const history = [
  ['Gospels, Revelation', 'Mark 3'],
  ['Pentateuch', 'Genesis 31'],
  ['Lesser Wisdom', 'Job 31'],
  ['NT letters 1', 'Galatians 1'],
  ['Psalms', 'Psalms 31'],
  ['OT history', 'Judges 7'],
  ['Acts, Romans, Hebrews', 'Acts 2'],
  ['OT prophets', 'Isaiah 31'],
  ['Proverbs', 'Proverbs 30'],
  ['NT letters 2', '2 Thessalonians 3'],
]

history.forEach(h => updatePlaceToChapter(h[0], h[1]))


lists.forEach((l, idx) => {
  console.log({
    name: l.name,
    length: l.chapterCount,
    next: getChapterByPlace(l.name),
    psc: state.find(p => p.name === l.name).playSequenceClock
  })
})
console.log(getPlaylist())


function updatePlaceToCount (listName, count) {
  const list = lists.find(l => l.name === listName)
  const place = state.find(p => p.name === listName)
  place.index = count % list.chapterCount
  place.playSequenceClock = nextPlaySequenceClock()
}

function updatePlaceToChapter (listName, chapter) {
  const list = lists.find(l => l.name === listName)
  const place = state.find(p => p.name === listName)
  const chapterIndex = list.chapterSequence.indexOf(chapter)
  if (chapterIndex >= 0) place.index = chapterIndex
  else throw new Error('Unknown chapter ' + chapter + ' for list ' + listName)
  place.playSequenceClock = nextPlaySequenceClock()
}

function incrementNextPlace (listName) {
  const list = lists.find(l => l.name === listName)
  const place = state.find(p => p.name === listName)
  place.index++
  if (place.index >= list.chapterCount) place.index = 0
  place.playSequenceClock = nextPlaySequenceClock()
}


function getChapterByPlace (listName) {
  const list = lists.find(l => l.name === listName)
  const place = state.find(p => p.name === listName)
  return list.chapterSequence[(place.index) % list.chapterCount]
}

function nextPlaySequenceClock () {
  return Math.max(-1, ...state.map(p => p.playSequenceClock).filter(p => p !== null)) + 1
}

function getPlaylist () {
  let idx = indexOfMax(state, p => p.playSequenceClock) + 1;

  const chapters = []
  for (let i = 0; i < lists.length; i++) {
    if (idx >= lists.length) idx = 0

    chapters.push(getChapterByPlace(lists[idx].name))

    idx++
  }
  return chapters
}


function rangeUntil (count) {
  const array = []
  for (let x = 0; x < count; x++) {
    array.push(x)
  }
  return array
}

function toD1 (n) {
  return Math.round(n * 10) / 10
}

function indexOfMax (list, fn) {
  let index = 0
  let max = -Infinity
  list.forEach((item, idx) => {
    const value = fn(item)
    if (max < value) {
      max = value
      index = idx
    }
  })
  return index
}
