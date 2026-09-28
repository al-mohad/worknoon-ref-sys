import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api.ts';
import type { RefundRequestCustomerView } from '../../lib/types.ts';
import { renderWithQueryClient } from '../../test/render.tsx';
import { ChatView } from './ChatView.tsx';

vi.mock('../../lib/api.ts', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);

const collecting: RefundRequestCustomerView = {
  reference: 'RF-CHAT0001',
  status: 'collecting_info',
  orderNumber: null,
  canRequestReview: false,
  messages: [
    { id: 'm1', role: 'assistant', content: 'Which order is this about?', createdAt: '2026-09-28T10:00:00Z' },
  ],
  decision: null,
};

const autoDenied: RefundRequestCustomerView = {
  reference: 'RF-CHAT0002',
  status: 'resolved',
  orderNumber: 'ORD-10260',
  canRequestReview: true,
  messages: [],
  decision: {
    outcome: 'DENIED',
    finalOutcome: 'DENIED',
    refund: { amountCents: 0, amount: '$0.00', currency: 'USD' },
    items: [{ sku: 'SHI-4471-M', name: 'Linen shirt (M)', quantity: 1, result: 'denied' }],
  },
};

function renderChat(request: RefundRequestCustomerView) {
  get.mockImplementation(async (path: string) => {
    if (path === '/health') return { status: 'ok', database: 'connected', ai: { mode: 'live', provider: null, model: null } };
    if (path === '/me/orders') return [];
    return request;
  });

  return renderWithQueryClient(
    <MemoryRouter initialEntries={[`/support/requests/${request.reference}`]}>
      <Routes>
        <Route path="/support/requests/:reference" element={<ChatView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ChatView', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('shows the sent message and a typing indicator while the reply is on its way', async () => {
    const user = userEvent.setup();
    post.mockReturnValue(new Promise(() => {}));
    renderChat(collecting);

    const composer = await screen.findByPlaceholderText(/Type a message/);
    await user.type(composer, 'It is ORD-10231, the carafe arrived cracked');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('It is ORD-10231, the carafe arrived cracked')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Checking your order' })).toBeInTheDocument();
    expect(composer).toBeDisabled();
    expect(post).toHaveBeenCalledWith(
      '/refund-requests/RF-CHAT0001/messages',
      expect.objectContaining({ content: 'It is ORD-10231, the carafe arrived cracked' }),
    );
  });

  it('sends an automatic denial for review when the customer asks', async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({ ...autoDenied, status: 'awaiting_review', canRequestReview: false });
    renderChat(autoDenied);

    await user.click(await screen.findByRole('button', { name: 'Ask an agent to review' }));

    expect(post).toHaveBeenCalledWith('/refund-requests/RF-CHAT0002/review-request');
    expect(await screen.findByText(/with a support agent for review/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ask an agent to review' })).not.toBeInTheDocument();
  });
});
