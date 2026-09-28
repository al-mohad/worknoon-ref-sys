import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DecisionView } from '../../lib/types.ts';
import { DecisionCard } from './DecisionCard.tsx';

const approved: DecisionView = {
  outcome: 'APPROVED',
  finalOutcome: 'APPROVED',
  refund: { amountCents: 4_800, amount: '$48.00', currency: 'USD' },
  items: [{ sku: 'KIT-2041', name: 'Ceramic pour-over set', quantity: 1, result: 'approved' }],
};

const denied: DecisionView = {
  outcome: 'DENIED',
  finalOutcome: 'DENIED',
  refund: { amountCents: 0, amount: '$0.00', currency: 'USD' },
  items: [{ sku: 'SHI-4471-M', name: 'Linen shirt (M)', quantity: 1, result: 'denied' }],
};

describe('DecisionCard', () => {
  it('shows the outcome, refund amount and each item', () => {
    render(<DecisionCard decision={approved} reference="RF-7Q2K9XMA" />);

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('$48.00')).toBeInTheDocument();
    expect(screen.getByText(/Ceramic pour-over set/)).toBeInTheDocument();
    expect(screen.getByText('RF-7Q2K9XMA')).toBeInTheDocument();
  });

  it('shows the final outcome when an agent overturned an escalation', () => {
    render(
      <DecisionCard decision={{ ...approved, outcome: 'ESCALATED', finalOutcome: 'APPROVED' }} reference="RF-1" />,
    );
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.queryByText('Escalated')).not.toBeInTheDocument();
  });

  it('hides the amount when nothing is being refunded', () => {
    render(<DecisionCard decision={denied} reference="RF-2" />);
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('offers a review only when the request allows it', () => {
    const onRequestReview = vi.fn();
    const { rerender } = render(
      <DecisionCard decision={denied} reference="RF-2" onRequestReview={onRequestReview} />,
    );
    expect(screen.queryByRole('button', { name: /review/i })).not.toBeInTheDocument();

    rerender(
      <DecisionCard decision={denied} reference="RF-2" canRequestReview onRequestReview={onRequestReview} />,
    );
    expect(screen.getByRole('button', { name: 'Ask an agent to review' })).toBeInTheDocument();
  });

  it('calls back when the review is requested, and blocks a second click while it sends', async () => {
    const user = userEvent.setup();
    const onRequestReview = vi.fn();
    const { rerender } = render(
      <DecisionCard decision={denied} reference="RF-2" canRequestReview onRequestReview={onRequestReview} />,
    );

    await user.click(screen.getByRole('button', { name: 'Ask an agent to review' }));
    expect(onRequestReview).toHaveBeenCalledOnce();

    rerender(
      <DecisionCard
        decision={denied}
        reference="RF-2"
        canRequestReview
        requestingReview
        onRequestReview={onRequestReview}
      />,
    );
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
  });
});
