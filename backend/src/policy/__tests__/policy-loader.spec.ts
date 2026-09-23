import { describe, expect, it } from 'vitest';
import { loadPolicy } from '../policy-loader.js';

describe('loadPolicy', () => {
  it('loads the bundled policy and agrees on a version with the Markdown doc', () => {
    const { policy, markdown } = loadPolicy();
    expect(policy.version).toBeTruthy();
    expect(markdown).toContain(policy.version);
  });
});
