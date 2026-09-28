import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api.ts';
import type { AiMode, Health } from '../lib/types.ts';
import { renderWithQueryClient } from '../test/render.tsx';
import { AiStatusBadge } from './AiStatusBadge.tsx';

vi.mock('../lib/api.ts', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const get = vi.mocked(api.get);

function healthWith(mode: AiMode): Health {
  return { status: 'ok', database: 'connected', ai: { mode, provider: 'openai', model: 'gpt-5-mini' } };
}

describe('AiStatusBadge', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('renders nothing while the AI layer is live', async () => {
    get.mockResolvedValue(healthWith('live'));
    const { client, container } = renderWithQueryClient(<AiStatusBadge />);

    await waitFor(() => expect(client.getQueryData(['health'])).toBeDefined());
    expect(container).toBeEmptyDOMElement();
  });

  it('warns when the provider is configured but not answering', async () => {
    get.mockResolvedValue(healthWith('degraded'));
    renderWithQueryClient(<AiStatusBadge />);

    expect(await screen.findByRole('status')).toHaveTextContent('AI assistant unavailable');
  });

  it('explains rules-only mode when no provider is configured', async () => {
    get.mockResolvedValue(healthWith('rules_only'));
    renderWithQueryClient(<AiStatusBadge />);

    expect(await screen.findByRole('status')).toHaveTextContent('rules-only mode');
  });
});
