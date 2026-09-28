import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api.ts';
import { renderWithQueryClient } from '../../test/render.tsx';
import { ReviewPanel } from './ReviewPanel.tsx';

vi.mock('../../lib/api.ts', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const post = vi.mocked(api.post);

function renderPanel(overrides: Partial<Parameters<typeof ReviewPanel>[0]> = {}) {
  return renderWithQueryClient(
    <ReviewPanel
      reference="RF-MX69BMM7"
      approvalAmount="$749.00"
      approvalRefundCents={74_900}
      reviewRequested={false}
      {...overrides}
    />,
  );
}

describe('ReviewPanel', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({});
  });

  it('keeps both actions disabled until the note is at least 10 characters', async () => {
    const user = userEvent.setup();
    renderPanel();

    const approve = screen.getByRole('button', { name: 'Approve' });
    const deny = screen.getByRole('button', { name: 'Deny' });
    expect(approve).toBeDisabled();
    expect(deny).toBeDisabled();

    await user.type(screen.getByLabelText('Note for the record'), 'too short');
    expect(approve).toBeDisabled();

    await user.type(screen.getByLabelText('Note for the record'), '!');
    expect(approve).toBeEnabled();
    expect(deny).toBeEnabled();
  });

  it('sends the chosen outcome and the note for this request', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByLabelText('Note for the record'), 'Confirmed damage from the photos sent by email.');
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(post).toHaveBeenCalledWith('/admin/refund-requests/RF-MX69BMM7/resolution', {
      outcome: 'APPROVED',
      note: 'Confirmed damage from the photos sent by email.',
    });
  });

  it('shows what an approval would pay', () => {
    renderPanel();
    expect(screen.getByText('$749.00')).toBeInTheDocument();
  });

  it('says so when approving carries no refund amount', () => {
    renderPanel({ approvalRefundCents: 0, approvalAmount: '$0.00' });
    expect(screen.getByText(/No claim was completed in chat/)).toBeInTheDocument();
  });

  it('flags a customer-requested review of an automatic denial', () => {
    renderPanel({ reviewRequested: true });
    expect(screen.getByText(/asked for a person to review this automatic denial/)).toBeInTheDocument();
  });
});
