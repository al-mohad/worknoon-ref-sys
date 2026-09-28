import { z } from 'zod';

// Anthropic's strict tool mode rejects a handful of JSON Schema keywords
// (length/count bounds, and the top-level $schema pointer). zod still
// enforces them after the call.
const UNSUPPORTED_KEYS = new Set([
  '$schema',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
]);

function stripUnsupportedKeywords(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(stripUnsupportedKeywords);
  }
  if (node !== null && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (UNSUPPORTED_KEYS.has(key)) continue;
      out[key] = stripUnsupportedKeywords(value);
    }
    return out;
  }
  return node;
}

/** Converts a zod schema into the JSON Schema a strict Anthropic/OpenAI tool call accepts. */
export function toToolSchema(schema: z.ZodType): Record<string, unknown> {
  return stripUnsupportedKeywords(z.toJSONSchema(schema)) as Record<string, unknown>;
}
