import { MAX_JSON_DEPTH } from './parseResource'

export interface TextLocation {
  line: number
  column: number
}

/**
 * Why the text stopped being valid JSON. The kinds cover the mistakes people
 * make when they edit FHIR JSON by hand or paste it from another program, so
 * the page can say what to fix and not only where.
 */
export type JsonProblemKind =
  | 'trailing-comma'
  | 'missing-value'
  | 'single-quote'
  | 'typographic-quote'
  | 'comment'
  | 'unquoted-key'
  | 'missing-colon'
  | 'missing-comma'
  | 'mismatched-bracket'
  | 'unexpected-end'
  | 'unterminated-string'
  | 'control-character-in-string'
  | 'invalid-escape'
  | 'unknown-word'
  | 'invalid-number'
  | 'extra-content'
  | 'unexpected-character'

export interface JsonProblem {
  kind: JsonProblemKind
  /** The text found where the error is, e.g. "}" or "True". */
  found?: string
  /** The closing bracket that was expected, for a mismatched bracket. */
  expected?: string
}

export interface JsonSyntaxError extends TextLocation {
  problem: JsonProblem
}

/** Line and column (both from 1) of a character offset in the text. */
export function locationOfOffset(text: string, offset: number): TextLocation {
  const before = text.slice(0, Math.max(0, Math.min(offset, text.length)))
  const lines = before.split('\n')
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 }
}

class SyntaxStop {
  constructor(
    readonly offset: number,
    readonly problem: JsonProblem,
  ) {}
}

/** Thrown when nesting passes MAX_JSON_DEPTH; the scanner is recursive and must not overflow the stack. */
class DepthStop {
  readonly reason = 'too-deep'
}

const LITERALS = ['true', 'false', 'null'] as const
const NUMBER_PATTERN = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y
const WORD_PATTERN = /[A-Za-z_$][\w$]*/y
/** Not sticky, so it can test a single character without a lastIndex. */
const WORD_START = /^[A-Za-z_$]$/
const ESCAPES = '"\\/bfnrt'
const HEX_PATTERN = /^[0-9a-fA-F]{4}$/
const TYPOGRAPHIC_QUOTES = '“”„‘’‚«»'
const CLOSERS = '}]'

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9'
}

/** Characters that start a value; seeing one where a comma belongs means the comma is missing. */
function startsValue(char: string): boolean {
  return '"{[-'.includes(char) || isDigit(char) || WORD_START.test(char)
}

/**
 * Minimal JSON scanner that finds where the text stops being valid JSON and
 * why. JSON.parse cannot be used for this: current Chrome and Node no longer
 * say where they failed ("Unexpected token '}' ... is not valid JSON"), and
 * never in a form that can be translated.
 */
class Scanner {
  private pos = 0
  private depth = 0

  constructor(private readonly text: string) {}

  scanDocument(): void {
    this.value()
    this.skipSpace()
    if (this.pos < this.text.length) this.stop({ kind: 'extra-content' })
  }

  private stop(problem: JsonProblem, offset: number = this.pos): never {
    throw new SyntaxStop(offset, problem)
  }

  private atEnd(): boolean {
    return this.pos >= this.text.length
  }

  private char(offset = 0): string {
    return this.text.charAt(this.pos + offset)
  }

  private skipSpace(): void {
    while (!this.atEnd() && ' \t\n\r'.includes(this.char())) this.pos += 1
  }

  /** The last character before pos that is not whitespace, to tell "1,}" from "1}". */
  private previousSignificant(): string {
    let i = this.pos - 1
    while (i >= 0 && ' \t\n\r'.includes(this.text.charAt(i))) i -= 1
    return i >= 0 ? this.text.charAt(i) : ''
  }

  /** Mistakes that look the same wherever a value or a key was expected. */
  private stopOnCommonMistake(): void {
    const char = this.char()
    if (this.atEnd()) this.stop({ kind: 'unexpected-end' })
    if (char === "'") this.stop({ kind: 'single-quote' })
    if (TYPOGRAPHIC_QUOTES.includes(char)) this.stop({ kind: 'typographic-quote', found: char })
    if (char === '/' && (this.char(1) === '/' || this.char(1) === '*')) this.stop({ kind: 'comment' })
    if (CLOSERS.includes(char)) {
      this.stop({ kind: this.previousSignificant() === ',' ? 'trailing-comma' : 'missing-value', found: char })
    }
  }

  private value(): void {
    this.skipSpace()
    const char = this.char()
    if (char === '{') this.container('}', true)
    else if (char === '[') this.container(']', false)
    else if (char === '"') this.string()
    else if (char === '-' || isDigit(char)) this.number()
    else if (WORD_START.test(char)) this.literal()
    else {
      this.stopOnCommonMistake()
      if (char === '+' || char === '.') this.stop({ kind: 'invalid-number' })
      this.stop({ kind: 'unexpected-character', found: char })
    }
  }

  private number(): void {
    NUMBER_PATTERN.lastIndex = this.pos
    const found = NUMBER_PATTERN.exec(this.text)
    if (found === null) this.stop({ kind: 'invalid-number' })
    this.pos += found[0].length
    // "01", "1." or "1e": the pattern stops early, and the rest would otherwise read as a missing comma.
    const next = this.char()
    if (next !== '' && (isDigit(next) || '.eE'.includes(next))) this.stop({ kind: 'invalid-number' })
  }

  private literal(): void {
    WORD_PATTERN.lastIndex = this.pos
    const word = WORD_PATTERN.exec(this.text)?.[0] ?? ''
    if (!LITERALS.some((literal) => literal === word)) this.stop({ kind: 'unknown-word', found: word })
    this.pos += word.length
  }

  /** Points at the offending character inside the string, or at its opening quote when it never ends. */
  private string(): void {
    const start = this.pos
    this.pos += 1
    while (!this.atEnd()) {
      const char = this.char()
      if (char === '"') {
        this.pos += 1
        return
      }
      if (char < ' ') this.stop({ kind: 'control-character-in-string', found: char })
      if (char === '\\') this.escape()
      else this.pos += 1
    }
    this.stop({ kind: 'unterminated-string' }, start)
  }

  private escape(): void {
    const next = this.char(1)
    if (next !== '' && ESCAPES.includes(next)) {
      this.pos += 2
      return
    }
    const hex = this.text.slice(this.pos + 2, this.pos + 6)
    if (next === 'u' && HEX_PATTERN.test(hex)) {
      this.pos += 6
      return
    }
    this.stop({ kind: 'invalid-escape', found: next === 'u' ? `\\u${hex}` : `\\${next}` })
  }

  private key(): void {
    this.skipSpace()
    const char = this.char()
    if (char === '"') return this.string()
    this.stopOnCommonMistake()
    if (WORD_START.test(char)) this.stop({ kind: 'unquoted-key' })
    this.stop({ kind: 'unexpected-character', found: char })
  }

  private colon(): void {
    this.skipSpace()
    if (this.char() === ':') {
      this.pos += 1
      return
    }
    this.stop({ kind: this.atEnd() ? 'unexpected-end' : 'missing-colon' })
  }

  /** What follows a value inside a container, when it is neither a comma nor the right closing bracket. */
  private stopAfterValue(close: string): never {
    const char = this.char()
    if (this.atEnd()) this.stop({ kind: 'unexpected-end' })
    if (char === '/' && (this.char(1) === '/' || this.char(1) === '*')) this.stop({ kind: 'comment' })
    if (CLOSERS.includes(char)) this.stop({ kind: 'mismatched-bracket', found: char, expected: close })
    if (startsValue(char) || char === "'" || TYPOGRAPHIC_QUOTES.includes(char)) this.stop({ kind: 'missing-comma' })
    this.stop({ kind: 'unexpected-character', found: char })
  }

  private container(close: string, isObject: boolean): void {
    this.depth += 1
    if (this.depth > MAX_JSON_DEPTH) throw new DepthStop()
    this.pos += 1
    this.skipSpace()
    if (this.char() === close) {
      this.pos += 1
      this.depth -= 1
      return
    }
    for (;;) {
      if (isObject) {
        this.key()
        this.colon()
      }
      this.value()
      this.skipSpace()
      const next = this.char()
      if (next === close) {
        this.pos += 1
        this.depth -= 1
        return
      }
      if (next !== ',') this.stopAfterValue(close)
      this.pos += 1
    }
  }
}

/**
 * Where the text stops being valid JSON and why, or undefined when it is valid
 * or nested too deeply to locate the error safely.
 */
export function locateJsonError(text: string): JsonSyntaxError | undefined {
  try {
    new Scanner(text).scanDocument()
    return undefined
  } catch (error) {
    if (error instanceof SyntaxStop) return { ...locationOfOffset(text, error.offset), problem: error.problem }
    if (error instanceof DepthStop) return undefined
    throw error
  }
}
