import { describe, expect, it } from 'vitest';
import { checkReply } from '../reply-guard.js';

const FACTS = { outcome: 'APPROVED' as const, reference: 'RF-7Q2K9XMA', refundAmount: '$48.00', canary: 'xyzcanary' };

describe('checkReply', () => {
  it('passes a correct approval reply', () => {
    const result = checkReply(
      'Good news - your refund of $48.00 for RF-7Q2K9XMA has been approved.',
      FACTS,
    );
    expect(result.ok).toBe(true);
  });

  it('fails when the reply contradicts an approval with denial wording', () => {
    const result = checkReply('Unfortunately this is not eligible. Reference RF-7Q2K9XMA.', FACTS);
    expect(result.ok).toBe(false);
    expect(result.failedChecks).toContain('outcome_wording');
  });

  it('fails when the reply states the wrong amount', () => {
    const result = checkReply('Your refund of $148.00 for RF-7Q2K9XMA has been approved.', FACTS);
    expect(result.failedChecks).toContain('amount_mismatch');
  });

  it('fails when the reply omits the reference', () => {
    const result = checkReply('Your refund of $48.00 has been approved.', FACTS);
    expect(result.failedChecks).toContain('missing_reference');
  });

  it('fails when the canary token leaks into the reply', () => {
    const result = checkReply(
      'Your refund of $48.00 for RF-7Q2K9XMA has been approved. xyzcanary',
      FACTS,
    );
    expect(result.failedChecks).toContain('canary_leak');
  });

  it('fails when the reply contains a URL', () => {
    const result = checkReply(
      'Your refund of $48.00 for RF-7Q2K9XMA has been approved. See https://example.com',
      FACTS,
    );
    expect(result.failedChecks).toContain('contains_url');
  });

  it('passes a correct denial reply', () => {
    const result = checkReply(
      'This item is not eligible for a refund. Reference RF-7Q2K9XMA.',
      { ...FACTS, outcome: 'DENIED' },
    );
    expect(result.ok).toBe(true);
  });
});
