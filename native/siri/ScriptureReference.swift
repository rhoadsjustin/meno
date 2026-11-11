// Spoken or typed Scripture references → a verse range.
//
// Foundation only, so it compiles and runs off-device: `npm run test:siri`
// (native/siri/checks). The book names it matches against
// are not in this file: the app publishes them, in every UI language, in the
// Siri context (src/services/siri).

import Foundation

/// One book of the canon as the app published it.
struct SiriBook: Codable, Sendable {
  /// OSIS id (`John`, `1Cor`) — the key for verse lookups.
  let id: String
  /// Display name in the app's UI language.
  let name: String
  /// English name, which the ESV API is queried with.
  let query: String
  let chapters: Int
  /// Every spoken or written form that names this book.
  let aliases: [String]
}

/// A parsed reference: an inclusive range inside one book.
struct ScriptureRange: Equatable, Sendable {
  /// Past any chapter's last verse (Psalm 119 has 176).
  static let chapterEnd = 999

  let bookIndex: Int
  let startChapter: Int
  let startVerse: Int
  let endChapter: Int
  let endVerse: Int

  /// Whether the request named whole chapters ("Psalm 23") rather than verses.
  var wholeChapters: Bool { startVerse == 1 && endVerse == ScriptureRange.chapterEnd }
}

enum ScriptureReferenceError: Error, Equatable {
  /// No book name in the request.
  case noBook
  /// A book, but no chapter or verse ("John").
  case noChapter(bookIndex: Int)
  /// A chapter the book does not have.
  case chapterOutOfRange(bookIndex: Int)
  /// Numbers that do not make a forward range ("John 3:16-2").
  case badRange
}

struct ScriptureReferenceParser: Sendable {
  private let books: [SiriBook]
  /// Normalized alias → index into `books`.
  private let bookByAlias: [String: Int]
  private let longestAlias: Int

  /// Words that mean "through" between two numbers, in the UI languages.
  private static let rangeWords: Set<String> = ["-", "to", "through", "thru", "a", "al", "hasta"]

  init(books: [SiriBook]) {
    self.books = books
    var byAlias: [String: Int] = [:]
    var longest = 1
    for (index, book) in books.enumerated() {
      for alias in book.aliases + [book.name, book.query, book.id] {
        let words = ScriptureReferenceParser.tokens(alias)
        guard !words.isEmpty else { continue }
        let key = words.joined(separator: " ")
        // First book to claim an alias keeps it (canonical order).
        if byAlias[key] == nil { byAlias[key] = index }
        longest = max(longest, words.count)
      }
    }
    bookByAlias = byAlias
    longestAlias = longest
  }

  /// Lowercased words and numbers, accents removed; `:` and dashes kept as
  /// their own tokens, every other mark dropped.
  static func tokens(_ text: String) -> [String] {
    let folded = text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil)
    var out = ""
    for scalar in folded.unicodeScalars {
      if CharacterSet.alphanumerics.contains(scalar) {
        out.unicodeScalars.append(scalar)
      } else if scalar == ":" {
        out += " : "
      } else if scalar == "-" || scalar == "\u{2013}" || scalar == "\u{2014}" {
        out += " - "
      } else {
        out += " "
      }
    }
    return out.split(separator: " ").map(String.init)
  }

  func parse(_ text: String) throws -> ScriptureRange {
    let tokens = ScriptureReferenceParser.tokens(text)
    guard let (bookIndex, rest) = findBook(in: tokens) else {
      throw ScriptureReferenceError.noBook
    }
    let book = books[bookIndex]

    // Numbers before and after the first "through"; other words ("chapter",
    // "verse", "and") carry no meaning the numbers' positions don't.
    var left: [Int] = []
    var right: [Int] = []
    var sawRange = false
    for token in rest {
      if let n = Int(token), n > 0 {
        if sawRange { right.append(n) } else { left.append(n) }
      } else if ScriptureReferenceParser.rangeWords.contains(token), !left.isEmpty {
        sawRange = true
      }
    }
    // "John 3 16 18" with nothing between: read as 3:16–18.
    if !sawRange, left.count == 3 {
      right = [left[2]]
      left = [left[0], left[1]]
    }
    // Dictation writes "John three sixteen" as "John 316": one number that is
    // not a chapter of the book is a chapter and verse run together.
    if left.count == 1, book.chapters > 1, left[0] > book.chapters,
      let (chapter, verse) = ScriptureReferenceParser.splitRunTogether(
        left[0], chapters: book.chapters)
    {
      left = [chapter, verse]
    }
    guard left.count <= 2, right.count <= 2 else { throw ScriptureReferenceError.badRange }

    let end = ScriptureRange.chapterEnd
    let range: ScriptureRange
    if book.chapters == 1 {
      // Jude 5, Jude 1:5, Jude 5-7, Jude: the one chapter is implied.
      let from = left.count == 2 ? left[1] : left.first
      guard left.count < 2 || left[0] == 1 else {
        throw ScriptureReferenceError.chapterOutOfRange(bookIndex: bookIndex)
      }
      guard right.count <= 1 else { throw ScriptureReferenceError.badRange }
      if let from {
        range = ScriptureRange(
          bookIndex: bookIndex, startChapter: 1, startVerse: from,
          endChapter: 1, endVerse: right.first ?? from)
      } else {
        range = ScriptureRange(
          bookIndex: bookIndex, startChapter: 1, startVerse: 1, endChapter: 1, endVerse: end)
      }
    } else {
      guard let chapter = left.first else {
        throw ScriptureReferenceError.noChapter(bookIndex: bookIndex)
      }
      if left.count == 1 {
        // "Psalm 23", or "Psalms 23 through 24".
        guard right.count <= 1 else { throw ScriptureReferenceError.badRange }
        range = ScriptureRange(
          bookIndex: bookIndex, startChapter: chapter, startVerse: 1,
          endChapter: right.first ?? chapter, endVerse: end)
      } else {
        let verse = left[1]
        switch right.count {
        case 0:
          range = ScriptureRange(
            bookIndex: bookIndex, startChapter: chapter, startVerse: verse,
            endChapter: chapter, endVerse: verse)
        case 1:
          range = ScriptureRange(
            bookIndex: bookIndex, startChapter: chapter, startVerse: verse,
            endChapter: chapter, endVerse: right[0])
        default:
          range = ScriptureRange(
            bookIndex: bookIndex, startChapter: chapter, startVerse: verse,
            endChapter: right[0], endVerse: right[1])
        }
      }
    }

    guard range.startChapter <= book.chapters, range.endChapter <= book.chapters else {
      throw ScriptureReferenceError.chapterOutOfRange(bookIndex: bookIndex)
    }
    let forward =
      range.startChapter < range.endChapter
      || (range.startChapter == range.endChapter && range.startVerse <= range.endVerse)
    guard forward else { throw ScriptureReferenceError.badRange }
    return range
  }

  /// Splits a run-together number into chapter and verse: 316 → 3:16,
  /// 828 → 8:28, 305 ("three oh five") → 3:5, 119105 → 119:105. A spoken
  /// number merges with what follows when the verse is said as a two-digit
  /// number, so that split is tried first, then a one-digit verse, then
  /// three digits. Nil when no split leaves a chapter the book has.
  static func splitRunTogether(_ number: Int, chapters: Int) -> (chapter: Int, verse: Int)? {
    let digits = String(number)
    for verseDigits in [2, 1, 3] where digits.count > verseDigits {
      let cut = digits.index(digits.endIndex, offsetBy: -verseDigits)
      guard let chapter = Int(digits[..<cut]), let verse = Int(digits[cut...]) else { continue }
      // No chapter has more verses than Psalm 119's 176.
      if chapter >= 1, chapter <= chapters, verse >= 1, verse <= 176 {
        return (chapter, verse)
      }
    }
    return nil
  }

  /// The first book named in the tokens (longest name at that position, so
  /// "1 John" is not read as "John"), and the tokens after it.
  private func findBook(in tokens: [String]) -> (Int, ArraySlice<String>)? {
    for start in tokens.indices {
      let most = min(longestAlias, tokens.count - start)
      for length in stride(from: most, through: 1, by: -1) {
        let key = tokens[start..<(start + length)].joined(separator: " ")
        if let index = bookByAlias[key] {
          return (index, tokens[(start + length)...])
        }
      }
    }
    return nil
  }
}
