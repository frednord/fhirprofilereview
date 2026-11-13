import type { JsonProblem } from './jsonErrorLocation'

/**
 * Characters that look like nothing or like something else on screen. They
 * usually come from copying text out of a web page, Word or a chat, and are
 * named so the user can find them.
 */
const NAMED_CHARACTERS: Readonly<Record<string, string>> = {
  ' ': 'ett hårt mellanslag (U+00A0)',
  '​': 'ett osynligt nollbreddstecken (U+200B)',
  '﻿': 'ett osynligt BOM-tecken (U+FEFF)',
  ' ': 'en osynlig radavgränsare (U+2028)',
  '\n': 'en radbrytning',
  '\r': 'en radbrytning',
  '\t': 'en tabb',
}

function codePoint(char: string): string {
  return `U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`
}

/** "”}”", or a name for a character that cannot be seen. */
export function describeCharacter(char: string): string {
  const named = Object.hasOwn(NAMED_CHARACTERS, char) ? NAMED_CHARACTERS[char] : undefined
  if (named !== undefined) return named
  if (char < ' ') return `ett styrtecken (${codePoint(char)})`
  return `”${char}”`
}

function controlCharacterText(found: string | undefined): string {
  if (found === '\n' || found === '\r') return 'radbrytning inne i en text. Skriv \\n i stället för att bryta raden'
  if (found === '\t') return 'tabb inne i en text. Skriv \\t i stället'
  return `${found === undefined ? 'ett styrtecken' : describeCharacter(found)} inne i en text, vilket inte är tillåtet i JSON`
}

/**
 * Says in Swedish what is wrong and how to fix it, for the message
 * "Texten är inte giltig JSON (rad 4, kolumn 1): <text>." Starts in lower case
 * since it follows a colon.
 */
export function describeJsonProblem(problem: JsonProblem): string {
  const found = problem.found === undefined ? '' : describeCharacter(problem.found)
  switch (problem.kind) {
    case 'trailing-comma':
      return `kommatecken före ${found}. JSON tillåter inget kommatecken efter sista värdet`
    case 'missing-value':
      return `ett värde saknas före ${found}`
    case 'single-quote':
      return 'enkla citattecken. JSON kräver dubbla citattecken (") runt text och nycklar'
    case 'typographic-quote':
      return `typografiskt citattecken (${problem.found ?? ''}). Använd raka dubbla citattecken ("). De byts ofta ut när text kopieras från Word eller e-post`
    case 'comment':
      return 'en kommentar. JSON tillåter inga kommentarer'
    case 'unquoted-key':
      return 'en nyckel utan citattecken. Nycklar skrivs inom dubbla citattecken, t.ex. "name"'
    case 'missing-colon':
      return 'kolon saknas efter nyckeln'
    case 'missing-comma':
      return 'kommatecken saknas mellan två värden'
    case 'mismatched-bracket':
      return `fel sorts klammer: ${found} stänger, men ${problem.expected === undefined ? 'en annan' : describeCharacter(problem.expected)} väntades`
    case 'unexpected-end':
      return 'texten tar slut för tidigt. Kontrollera att alla klamrar och citattecken stängs'
    case 'unterminated-string':
      return 'texten som börjar här saknar avslutande citattecken'
    case 'control-character-in-string':
      return controlCharacterText(problem.found)
    case 'invalid-escape':
      return `ogiltig escape-sekvens ${found}. Tillåtna är \\" \\\\ \\/ \\b \\f \\n \\r \\t och \\uXXXX`
    case 'unknown-word':
      return `okänt ord ${found}. JSON känner bara till true, false och null, och text skrivs inom dubbla citattecken`
    case 'invalid-number':
      return 'ogiltigt tal. Tal får inte börja med + eller punkt, ha inledande nollor eller sluta med punkt eller e'
    case 'extra-content':
      return 'text efter resursens slut. Klistra in en resurs i taget'
    case 'unexpected-character':
      return `oväntat tecken: ${found}`
  }
}
