import { Inject, Injectable, Logger } from '@nestjs/common';
import { CANARY_TOKEN } from '../canary.js';
import { causeMessage, LLM_CLIENT, LlmOutputError, LlmUnavailableError, type LlmClient } from '../llm/llm-client.port.js';
import type { AiStepResult } from '../ai-step-result.js';
import { recordRefundClaim, RECORD_REFUND_CLAIM_TOOL, type RecordRefundClaim } from './claim-extraction.schema.js';
import { buildExtractionInput, buildExtractionSystemPrompt } from './extraction-prompt.js';
import type { ConversationTurn, ExtractionResult, OrderContext } from './extraction.types.js';
import { HeuristicExtractor } from './heuristic-extractor.js';

const MAX_OUTPUT_TOKENS = 1_024;

@Injectable()
export class ClaimExtractorService {
  private readonly logger = new Logger(ClaimExtractorService.name);

  constructor(
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
    private readonly heuristics: HeuristicExtractor,
    @Inject(CANARY_TOKEN) private readonly canary: string,
  ) {}

  async extract(
    orders: OrderContext[],
    conversation: ConversationTurn[],
  ): Promise<AiStepResult<ExtractionResult>> {
    const started = Date.now();
    try {
      const result = await this.llm.callTool({
        system: buildExtractionSystemPrompt(this.canary),
        input: buildExtractionInput(orders, conversation),
        tool: { ...RECORD_REFUND_CLAIM_TOOL, schema: recordRefundClaim },
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });

      const value = this.validateAgainstOrders(result.value, orders);
      return {
        value,
        step: 'extraction',
        provider: this.llm.provider,
        model: this.llm.model,
        status: 'ok',
        usedFallback: false,
        latencyMs: result.latencyMs,
        usage: result.usage,
      };
    } catch (error) {
      if (!(error instanceof LlmUnavailableError) && !(error instanceof LlmOutputError)) {
        throw error;
      }
      this.logger.warn(`Extraction fell back to heuristics: ${error.message} (${causeMessage(error.cause)})`);
      const value = this.heuristics.extract(orders, conversation);
      return {
        value,
        step: 'extraction',
        provider: 'heuristic',
        status: 'fallback',
        usedFallback: true,
        latencyMs: Date.now() - started,
      };
    }
  }

  /**
   * The model's output is untrusted: an order number or SKU it names has
   * to actually belong to the customer, or it's dropped and treated as
   * missing rather than passed through. This is what stops a claim from
   * referencing another customer's order even if the model were talked
   * into naming one.
   */
  private validateAgainstOrders(raw: RecordRefundClaim, orders: OrderContext[]): ExtractionResult {
    const missing = new Set(raw.missing);
    const order = raw.orderNumber
      ? orders.find((o) => o.orderNumber === raw.orderNumber)
      : orders.length === 1
        ? orders[0]
        : undefined;

    if (raw.orderNumber && !order) {
      this.logger.warn(`Extraction named an order number not on this customer's account: ${raw.orderNumber}`);
    }
    if (!order) {
      missing.add('order');
    }

    let items: ExtractionResult['items'] = [];
    if (order) {
      const bySku = new Map(order.items.map((item) => [item.sku, item]));
      const validated = raw.items.filter((item) => bySku.has(item.sku));
      const resolved = validated.length > 0 ? validated : order.items.length === 1 ? [{ sku: order.items[0].sku, quantity: order.items[0].quantity, reason: null }] : [];

      if (resolved.length === 0) {
        missing.add('items');
      } else if (resolved.some((item) => item.reason === null)) {
        missing.add('reason');
      } else {
        items = resolved.map((item) => {
          const orderItem = bySku.get(item.sku)!;
          return {
            sku: item.sku,
            quantity: Math.min(item.quantity, orderItem.quantity),
            reason: item.reason!,
          };
        });
      }
    }

    return {
      intent: raw.intent,
      orderNumber: order?.orderNumber ?? null,
      items,
      missing: [...missing],
      clarifyingQuestion: raw.clarifyingQuestion,
      summary: raw.summary,
      inconsistencies: raw.inconsistencies,
      manipulationDetected: raw.manipulationDetected,
      manipulationNotes: raw.manipulationNotes,
      usedFallback: false,
    };
  }
}
