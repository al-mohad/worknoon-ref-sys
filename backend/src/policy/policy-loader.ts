import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { REFUND_REASONS, type RefundPolicy } from './engine/types.js';

const policySchema = z.object({
  version: z.string(),
  effectiveFrom: z.string(),
  currency: z.literal('USD'),
  refundWindowDays: z.number().int().positive(),
  reviewThresholdCents: z.number().int().nonnegative(),
  lostInTransitGraceDays: z.number().int().nonnegative(),
  refundFrequency: z.object({
    lookbackDays: z.number().int().positive(),
    reviewAt: z.number().int().positive(),
  }),
  merchantErrorReasons: z.array(z.enum(REFUND_REASONS)),
  maxClarifyingQuestions: z.number().int().positive(),
  reviewTargetBusinessDays: z.number().int().positive(),
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const POLICY_DIR = join(__dirname, '..', '..', 'policy');

/** Pulls `version: ...` out of the Markdown doc's `---` front matter block. */
function readMarkdownVersion(markdown: string): string {
  const frontMatterPattern = /^---\s*\n([\s\S]*?)\n---/;
  const match = markdown.match(frontMatterPattern);
  if (!match) {
    throw new Error('refund-policy.md is missing its front matter block');
  }
  const versionLine = match[1].split('\n').find((line) => line.startsWith('version:'));
  if (!versionLine) {
    throw new Error('refund-policy.md front matter is missing a version field');
  }
  return versionLine.replace('version:', '').trim();
}

export interface PolicyDocument {
  policy: RefundPolicy;
  markdown: string;
}

/**
 * Loads and cross-checks the two policy files. A mismatch between the
 * customer-facing document and the machine-readable rules means one of
 * them was edited without the other, so this fails loudly at boot rather
 * than letting the two drift silently.
 */
export function loadPolicy(dir: string = POLICY_DIR): PolicyDocument {
  const json = JSON.parse(readFileSync(join(dir, 'refund-policy.json'), 'utf-8'));
  const policy = policySchema.parse(json);
  const markdown = readFileSync(join(dir, 'refund-policy.md'), 'utf-8');

  const markdownVersion = readMarkdownVersion(markdown);
  if (markdownVersion !== policy.version) {
    throw new Error(
      `Policy version mismatch: refund-policy.json is "${policy.version}" but ` +
        `refund-policy.md front matter is "${markdownVersion}"`,
    );
  }

  return { policy, markdown };
}
