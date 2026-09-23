import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClaimExtractorService } from '../ai/extraction/claim-extractor.service.js';
import type { ConversationTurn, ExtractionResult, OrderContext } from '../ai/extraction/extraction.types.js';
import { ReplyWriterService } from '../ai/replies/reply-writer.service.js';
import { nextStepsFor, reasonCodesToText } from '../ai/replies/templates.js';
import type { DecisionFacts } from '../ai/replies/reply.types.js';
import { Clock } from '../common/clock.js';
import { formatCents } from '../common/money.js';
import { CustomersService } from '../customers/customers.service.js';
import type { OrderDocument } from '../database/schemas/order.schema.js';
import type { RefundRequestDocument } from '../database/schemas/refund-request.schema.js';
import { detectManipulation } from '../guardrails/detect-manipulation.js';
import { sanitizeCustomerText } from '../guardrails/sanitize.js';
import { OrdersService } from '../orders/orders.service.js';
import { evaluate } from '../policy/engine/evaluate.js';
import type { OrderFacts, RefundOutcome } from '../policy/engine/types.js';
import type { PolicyDocument } from '../policy/policy-loader.js';
import { POLICY_DOCUMENT } from '../policy/policy.tokens.js';
import { HistoryService } from './history.service.js';
import { RefundRequestsRepository } from './refund-requests.repository.js';

function toOrderContext(order: OrderDocument): OrderContext {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    items: order.items.map((item) => ({ sku: item.sku, name: item.name, quantity: item.quantity })),
  };
}

function toOrderFacts(order: OrderDocument): OrderFacts {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.placedAt,
    deliveredAt: order.deliveredAt,
    estimatedDeliveryAt: order.estimatedDeliveryAt,
    items: order.items.map((item) => ({
      sku: item.sku,
      name: item.name,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      finalSale: item.finalSale,
    })),
  };
}

@Injectable()
export class RefundWorkflowService {
  constructor(
    private readonly repo: RefundRequestsRepository,
    private readonly customers: CustomersService,
    private readonly orders: OrdersService,
    private readonly history: HistoryService,
    private readonly extractor: ClaimExtractorService,
    private readonly replyWriter: ReplyWriterService,
    private readonly clock: Clock,
    @Inject(POLICY_DOCUMENT) private readonly policyDoc: PolicyDocument,
  ) {}

  async createRequest(customerId: Types.ObjectId, initialMessage?: string): Promise<RefundRequestDocument> {
    const request = await this.repo.create(customerId);
    if (initialMessage) {
      return this.handleMessage(customerId, request.reference, initialMessage, randomUUID());
    }
    return request;
  }

  async handleMessage(
    customerId: Types.ObjectId,
    reference: string,
    rawContent: string,
    clientMessageId: string,
  ): Promise<RefundRequestDocument> {
    const request = await this.repo.findByReferenceForCustomer(reference, customerId);
    if (!request) {
      throw new NotFoundException(`Refund request ${reference} not found`);
    }

    const alreadyProcessed = request.messages.some((m) => m.clientMessageId === clientMessageId);
    if (alreadyProcessed) {
      return request;
    }
    if (request.status !== 'collecting_info') {
      throw new ConflictException(`${reference} is not accepting new messages.`);
    }

    const now = this.clock.now();
    const sanitized = sanitizeCustomerText(rawContent);
    const heuristicSignal = detectManipulation(sanitized);

    request.messages.push({
      id: randomUUID(),
      role: 'customer',
      content: sanitized,
      createdAt: now,
      clientMessageId,
    });
    request.signals.manipulation.heuristic = request.signals.manipulation.heuristic || heuristicSignal.flagged;

    const orderContexts = await this.resolveOrderContexts(customerId, request.orderNumber);
    const conversation: ConversationTurn[] = request.messages
      .filter((m) => m.role === 'customer' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({ role: m.role === 'customer' ? 'customer' : 'assistant', content: m.content }));

    const extraction = await this.extractor.extract(orderContexts, conversation);
    request.aiSteps.push({
      step: extraction.step,
      provider: extraction.provider,
      model: extraction.model,
      status: extraction.status,
      usedFallback: extraction.usedFallback,
      latencyMs: extraction.latencyMs,
      usage: extraction.usage,
      createdAt: now,
    });

    request.signals.manipulation.model = request.signals.manipulation.model || extraction.value.manipulationDetected;
    if (extraction.value.manipulationNotes) {
      request.signals.manipulation.notes = extraction.value.manipulationNotes;
    }
    for (const note of extraction.value.inconsistencies) {
      if (!request.signals.inconsistencies.includes(note)) {
        request.signals.inconsistencies.push(note);
      }
    }

    if (extraction.value.intent !== 'refund_request') {
      request.messages.push({
        id: randomUUID(),
        role: 'assistant',
        content:
          extraction.value.intent === 'order_question'
            ? "I can help with refunds here - for general order questions, our support team can follow up by email. If you'd like a refund, tell me what's wrong with the item."
            : "I'm set up to help with refund requests. If you'd like a refund for an order, tell me which order and what's wrong with it.",
        createdAt: now,
      });
      await request.save();
      return request;
    }

    if (extraction.value.missing.length > 0) {
      await this.handleIncompleteClaim(request, extraction.value.clarifyingQuestion, now);
      await request.save();
      return request;
    }

    await this.resolveClaim(request, customerId, extraction.value, now);
    await request.save();
    return request;
  }

  async resolveByAgent(
    reference: string,
    agentId: Types.ObjectId,
    agentName: string,
    outcome: 'APPROVED' | 'DENIED',
    note: string,
  ): Promise<RefundRequestDocument> {
    const request = await this.repo.findByReferenceOrThrow(reference);
    if (request.status !== 'awaiting_review') {
      throw new ConflictException(`${reference} is not awaiting review.`);
    }

    const now = this.clock.now();
    const refundCents = outcome === 'APPROVED' ? (request.evaluation?.refundableCents ?? 0) : 0;
    request.resolution = {
      outcome,
      refundCents,
      resolvedBy: { type: 'agent', agentId, name: agentName },
      note,
      resolvedAt: now,
    };
    request.status = 'resolved';
    request.timeline.push({
      type: 'resolved_by_agent',
      detail: `${agentName} ${outcome === 'APPROVED' ? 'approved' : 'denied'} the request.`,
      at: now,
    });
    request.messages.push({
      id: randomUUID(),
      role: 'agent_note',
      content:
        outcome === 'APPROVED'
          ? `An agent reviewed your request and approved a refund of ${formatCents(refundCents)}. ${nextStepsFor('APPROVED')}`
          : `An agent reviewed your request and it was not approved. ${note}`,
      createdAt: now,
    });

    await request.save();
    return request;
  }

  private async resolveOrderContexts(customerId: Types.ObjectId, orderNumber?: string): Promise<OrderContext[]> {
    if (orderNumber) {
      const order = await this.orders.findByOrderNumberForCustomer(orderNumber, customerId);
      return order ? [toOrderContext(order)] : [];
    }
    const orders = await this.orders.findByCustomer(customerId);
    return orders.map(toOrderContext);
  }

  private async handleIncompleteClaim(
    request: RefundRequestDocument,
    clarifyingQuestion: string | null,
    now: Date,
  ): Promise<void> {
    request.clarificationCount += 1;

    if (request.clarificationCount > this.policyDoc.policy.maxClarifyingQuestions) {
      request.decision = { outcome: 'ESCALATED', reasonCodes: ['INSUFFICIENT_DETAILS'], decidedAt: now };
      request.status = 'awaiting_review';
      request.timeline.push({
        type: 'escalated',
        detail: 'Escalated after repeated clarifying questions went unanswered clearly.',
        at: now,
      });
      request.messages.push({
        id: randomUUID(),
        role: 'assistant',
        content: `Thanks for the details so far. I've sent this to a support agent to sort out the rest - reference ${request.reference}. ${nextStepsFor('ESCALATED')}`,
        createdAt: now,
      });
      return;
    }

    request.messages.push({
      id: randomUUID(),
      role: 'assistant',
      content: clarifyingQuestion ?? 'Could you share a bit more detail about the order and the issue?',
      createdAt: now,
    });
  }

  private async resolveClaim(
    request: RefundRequestDocument,
    customerId: Types.ObjectId,
    extraction: ExtractionResult,
    now: Date,
  ): Promise<void> {
    const orderNumber = extraction.orderNumber!;
    request.orderNumber = orderNumber;

    const order = await this.orders.findByOrderNumberForCustomer(orderNumber, customerId);
    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found for this customer`);
    }

    const orderFacts = toOrderFacts(order);
    const history = await this.history.build(
      orderNumber,
      customerId,
      request._id,
      this.policyDoc.policy.refundFrequency.lookbackDays,
    );

    const evaluation = evaluate({
      now,
      policy: this.policyDoc.policy,
      order: orderFacts,
      items: extraction.items,
      history,
      signals: {
        manipulation: request.signals.manipulation.heuristic || request.signals.manipulation.model,
        inconsistencies: request.signals.inconsistencies,
      },
    });

    request.evaluation = {
      policyVersion: this.policyDoc.policy.version,
      evaluatedAt: now,
      facts: { order: orderFacts, history: { ...history, openRequestSkus: [...history.openRequestSkus] } },
      checks: evaluation.checks,
      lines: evaluation.lines,
      refundableCents: evaluation.refundableCents,
    };
    request.decision = { outcome: evaluation.outcome, reasonCodes: evaluation.reasonCodes, decidedAt: now };

    const customer = await this.customers.findByIdOrThrow(customerId.toString());
    const facts: DecisionFacts = {
      firstName: customer.name.split(' ')[0] ?? customer.name,
      outcome: evaluation.outcome,
      reference: request.reference,
      items: evaluation.lines.map((line) => ({ name: line.name, result: line.outcome })),
      refundAmount: formatCents(evaluation.refundableCents),
      reasons: reasonCodesToText(evaluation.reasonCodes),
      nextSteps: nextStepsFor(evaluation.outcome),
    };

    const reply = await this.replyWriter.write(facts);
    request.aiSteps.push({
      step: reply.step,
      provider: reply.provider,
      model: reply.model,
      status: reply.status,
      usedFallback: reply.usedFallback,
      latencyMs: reply.latencyMs,
      usage: reply.usage,
      createdAt: now,
    });
    request.messages.push({ id: randomUUID(), role: 'assistant', content: reply.value, createdAt: now });

    if (evaluation.outcome === 'ESCALATED') {
      request.status = 'awaiting_review';
      request.timeline.push({ type: 'escalated', detail: 'Sent to a support agent for review.', at: now });
      return;
    }

    const outcome = evaluation.outcome as RefundOutcome & ('APPROVED' | 'DENIED');
    request.status = 'resolved';
    request.resolution = {
      outcome,
      refundCents: evaluation.refundableCents,
      resolvedBy: { type: 'system' },
      resolvedAt: now,
    };
    request.timeline.push({ type: 'resolved', detail: `Automatically ${outcome.toLowerCase()}.`, at: now });
  }
}
