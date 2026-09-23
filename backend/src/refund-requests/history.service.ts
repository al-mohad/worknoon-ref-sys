import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type { RefundHistory } from '../policy/engine/types.js';
import { RefundRequestsRepository } from './refund-requests.repository.js';

@Injectable()
export class HistoryService {
  constructor(private readonly repo: RefundRequestsRepository) {}

  /**
   * Refund history is derived from other refund_requests rather than
   * stored as a running counter, so there is one source of truth and no
   * risk of a counter drifting out of sync. See docs/design.md section 3.
   */
  async build(
    orderNumber: string,
    customerId: Types.ObjectId,
    currentRequestId: Types.ObjectId,
    lookbackDays: number,
  ): Promise<RefundHistory> {
    const others = await this.repo.findOthersForOrder(orderNumber, currentRequestId);

    const refundedQuantityBySku: Record<string, number> = {};
    const openRequestSkus = new Set<string>();

    for (const other of others) {
      if (other.status !== 'resolved') {
        for (const line of other.evaluation?.lines ?? []) {
          openRequestSkus.add(line.sku);
        }
        for (const item of other.claim?.items ?? []) {
          openRequestSkus.add(item.sku);
        }
        continue;
      }
      if (other.resolution?.outcome === 'APPROVED') {
        for (const line of other.evaluation?.lines ?? []) {
          if (line.outcome === 'approved') {
            refundedQuantityBySku[line.sku] = (refundedQuantityBySku[line.sku] ?? 0) + line.quantity;
          }
        }
      }
    }

    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const approvedRefundCountInWindow = await this.repo.countApprovedSince(customerId, since, currentRequestId);

    return { refundedQuantityBySku, openRequestSkus, approvedRefundCountInWindow };
  }
}
