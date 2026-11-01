export interface TextLocation {
  line: number
  column: number
}

/** Line and column (both from 1) of a character offset in the text. */
export function locationOfOffset(text: string, offset: number): TextLocation {
  const before = text.slice(0, Math.max(0, Math.min(offset, text.length)))
  const lines = before.split('\n')
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 }
}

class SyntaxStop {
  constructor(readonly offset: number) {}
}

const LITERALS = ['true', 'false', 'null'] as const
const NUMBER_PATTERN = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y
// JSON strings may not contain raw control characters, so the pattern has to name them.
// eslint-disable-next-line no-control-regex
const STRING_PATTERN = /"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/y

/**
 * Minimal JSON scanner that only finds where the text stops being valid JSON.
 * JSON.parse cannot be used for this: current Chrome and Node no longer say
 * where they failed ("Unexpected token '}' ... is not valid JSON").
 */
class Scanner {
  private pos = 0

  constructor(private readonly text: string) {}

  scanDocument(): void {
    this.value()
    this.skipSpace()
    if (this.pos < this.text.length) this.stop()
  }

  private stop(): never {
    throw new SyntaxStop(this.pos)
  }

  private skipSpace(): void {
    while (this.pos < this.text.length && ' \t\n\r'.includes(this.text.charAt(this.pos))) this.pos += 1
  }

  private expect(char: string): void {
    this.skipSpace()
    if (this.text.charAt(this.pos) !== char) this.stop()
    this.pos += 1
  }

  private match(pattern: RegExp): void {
    pattern.lastIndex = this.pos
    const found = pattern.exec(this.text)
    if (found === null) this.stop()
    this.pos += found[0].length
  }

  private value(): void {
    this.skipSpace()
    const char = this.text.charAt(this.pos)
    if (char === '{') this.container('}', true)
    else if (char === '[') this.container(']', false)
    else if (char === '"') this.match(STRING_PATTERN)
    else if (char === '-' || (char >= '0' && char <= '9')) this.match(NUMBER_PATTERN)
    else this.literal()
  }

  private literal(): void {
    const word = LITERALS.find((literal) => this.text.startsWith(literal, this.pos))
    if (word === undefined) this.stop()
    this.pos += word.length
  }

  private container(close: string, isObject: boolean): void {
    this.pos += 1
    this.skipSpace()
    if (this.text.charAt(this.pos) === close) {
      this.pos += 1
      return
    }
    for (;;) {
      if (isObject) {
        this.skipSpace()
        if (this.text.charAt(this.pos) !== '"') this.stop()
        this.match(STRING_PATTERN)
        this.expect(':')
      }
      this.value()
      this.skipSpace()
      const next = this.text.charAt(this.pos)
      if (next === close) {
        this.pos += 1
        return
      }
      if (next !== ',') this.stop()
      this.pos += 1
    }
  }
}

/** Where the text stops being valid JSON, or undefined when it is valid. */
export function locateJsonError(text: string): TextLocation | undefined {
  try {
    new Scanner(text).scanDocument()
    return undefined
  } catch (error) {
    if (error instanceof SyntaxStop) return locationOfOffset(text, error.offset)
    throw error
  }
}
