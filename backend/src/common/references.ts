import { randomBytes } from 'node:crypto';

// Crockford base32: no I, L, O or U, so a spoken or typed reference can't be
// confused with a digit and can't accidentally spell something awkward.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomBase32(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function generateRefundReference(): string {
  return `RF-${randomBase32(8)}`;
}

export function generateCustomerNumber(sequence: number): string {
  return `CUS-${(1000 + sequence).toString()}`;
}

export function generateOrderNumber(sequence: number): string {
  return `ORD-${(10000 + sequence).toString()}`;
}
