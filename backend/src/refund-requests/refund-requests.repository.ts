import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { generateRefundReference } from '../common/references.js';
import { RefundRequest, type RefundRequestDocument } from '../database/schemas/refund-request.schema.js';

export interface AdminListFilters {
  status?: 'collecting_info' | 'awaiting_review' | 'resolved';
  outcome?: 'APPROVED' | 'DENIED' | 'ESCALATED';
  flagged?: boolean;
  q?: string;
  limit: number;
  cursor?: string;
}

@Injectable()
export class RefundRequestsRepository {
  constructor(@InjectModel(RefundRequest.name) private readonly model: Model<RefundRequest>) {}

  async create(customerId: Types.ObjectId, orderNumber?: string): Promise<RefundRequestDocument> {
    return this.model.create({
      reference: generateRefundReference(),
      customerId,
      orderNumber,
      channel: 'chat',
      status: 'collecting_info',
      messages: [],
      signals: { manipulation: { heuristic: false, model: false }, inconsistencies: [] },
      aiSteps: [],
      timeline: [{ type: 'created', detail: 'Refund request opened.', at: new Date() }],
      clarificationCount: 0,
    });
  }

  async findByReferenceForCustomer(
    reference: string,
    customerId: Types.ObjectId,
  ): Promise<RefundRequestDocument | null> {
    return this.model.findOne({ reference, customerId });
  }

  async findByReferenceOrThrow(reference: string): Promise<RefundRequestDocument> {
    const doc = await this.model.findOne({ reference });
    if (!doc) {
      throw new NotFoundException(`Refund request ${reference} not found`);
    }
    return doc;
  }

  async findByCustomer(customerId: Types.ObjectId): Promise<RefundRequestDocument[]> {
    return this.model.find({ customerId }).sort({ createdAt: -1 });
  }

  /** Every other request against the same order, used to compute refund history. */
  async findOthersForOrder(orderNumber: string, excludeId: Types.ObjectId): Promise<RefundRequestDocument[]> {
    return this.model.find({ orderNumber, _id: { $ne: excludeId } });
  }

  /** Approved-and-resolved requests for a customer within a lookback window, used for the frequency rule. */
  async countApprovedSince(customerId: Types.ObjectId, since: Date, excludeId: Types.ObjectId): Promise<number> {
    return this.model.countDocuments({
      customerId,
      _id: { $ne: excludeId },
      'resolution.outcome': 'APPROVED',
      'resolution.resolvedAt': { $gte: since },
    });
  }

  async listForAdmin(filters: AdminListFilters): Promise<{ items: RefundRequestDocument[]; nextCursor: string | null }> {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.outcome) query['decision.outcome'] = filters.outcome;
    if (filters.flagged) {
      query.$or = [{ 'signals.manipulation.heuristic': true }, { 'signals.manipulation.model': true }];
    }
    if (filters.q) {
      const escaped = filters.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(escaped, 'i');
      query.$or = [...((query.$or as unknown[]) ?? []), { reference: pattern }, { orderNumber: pattern }];
    }
    if (filters.cursor) {
      const cursorDate = new Date(Buffer.from(filters.cursor, 'base64url').toString('utf-8'));
      query.createdAt = { $lt: cursorDate };
    }

    const items = await this.model
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit + 1);

    const hasMore = items.length > filters.limit;
    const page = hasMore ? items.slice(0, filters.limit) : items;
    const nextCursor = hasMore
      ? Buffer.from(page[page.length - 1].get('createdAt').toISOString(), 'utf-8').toString('base64url')
      : null;

    return { items: page, nextCursor };
  }

  async recentMetrics(since: Date) {
    const [total, byOutcome, byStatus, flagged] = await Promise.all([
      this.model.countDocuments({ createdAt: { $gte: since } }),
      this.model.aggregate<{ _id: string | null; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$decision.outcome', count: { $sum: 1 } } },
      ]),
      this.model.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.model.countDocuments({
        createdAt: { $gte: since },
        $or: [{ 'signals.manipulation.heuristic': true }, { 'signals.manipulation.model': true }],
      }),
    ]);

    return { total, byOutcome, byStatus, flagged };
  }
}
