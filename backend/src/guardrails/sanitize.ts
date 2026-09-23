const MAX_MESSAGE_LENGTH = 2_000;

// Control characters (excluding tab/newline/CR, which are legitimate in a
// multi-line message) plus the zero-width and line-separator characters
// sometimes used to hide text from a human reviewer while an LLM still
// reads it. Built from code points rather than a regex literal so the
// non-printing characters never have to appear as raw bytes in this file.
const BANNED_CODE_POINT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x0008],
  [0x000b, 0x000c],
  [0x000e, 0x001f],
  [0x007f, 0x007f],
  [0x200b, 0x200f], // zero-width space/joiner/non-joiner, LTR/RTL marks
  [0x2028, 0x2029], // line/paragraph separator
  [0xfeff, 0xfeff], // byte-order mark
];

function isBannedCodePoint(codePoint: number): boolean {
  return BANNED_CODE_POINT_RANGES.some(([start, end]) => codePoint >= start && codePoint <= end);
}

function stripBannedCharacters(input: string): string {
  let out = '';
  for (const char of input) {
    if (!isBannedCodePoint(char.codePointAt(0)!)) {
      out += char;
    }
  }
  return out;
}

/**
 * Runs on every customer message before it reaches a prompt or the
 * database: Unicode-normalizes it, strips characters that exist mainly to
 * hide text from a human reviewer, caps its length, and escapes the angle
 * brackets that would otherwise let a message close the `<customer_message>`
 * tag the extraction prompt wraps it in.
 */
export function sanitizeCustomerText(input: string): string {
  const normalized = input.normalize('NFKC');
  const stripped = stripBannedCharacters(normalized);
  const trimmed = stripped.trim().slice(0, MAX_MESSAGE_LENGTH);
  return trimmed.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
