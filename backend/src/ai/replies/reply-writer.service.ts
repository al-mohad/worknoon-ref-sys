import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AiStepResult } from '../ai-step-result.js';
import { CANARY_TOKEN } from '../canary.js';
import { checkReply } from '../../guardrails/reply-guard.js';
import { LLM_CLIENT, LlmOutputError, LlmUnavailableError, type LlmClient } from '../llm/llm-client.port.js';
import { buildReplyInput, buildReplySystemPrompt } from './reply-prompt.js';
import { renderTemplateReply } from './templates.js';
import type { DecisionFacts } from './reply.types.js';

const MAX_OUTPUT_TOKENS = 512;

@Injectable()
export class ReplyWriterService {
  private readonly logger = new Logger(ReplyWriterService.name);

  constructor(
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
    @Inject(CANARY_TOKEN) private readonly canary: string,
  ) {}

  async write(facts: DecisionFacts): Promise<AiStepResult<string>> {
    const started = Date.now();
    try {
      const result = await this.llm.complete({
        system: buildReplySystemPrompt(this.canary),
        input: buildReplyInput(facts),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });

      const guard = checkReply(result.value, {
        outcome: facts.outcome,
        reference: facts.reference,
        refundAmount: facts.refundAmount,
        canary: this.canary,
      });

      if (!guard.ok) {
        this.logger.warn(`Reply guard rejected a model reply: ${guard.failedChecks.join(', ')}`);
        return {
          value: renderTemplateReply(facts),
          step: 'reply',
          provider: this.llm.provider,
          model: this.llm.model,
          status: 'fallback',
          usedFallback: true,
          latencyMs: Date.now() - started,
          usage: result.usage,
        };
      }

      return {
        value: result.value,
        step: 'reply',
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
      this.logger.warn(`Reply generation fell back to a template: ${error.message}`);
      return {
        value: renderTemplateReply(facts),
        step: 'reply',
        provider: 'heuristic',
        status: 'fallback',
        usedFallback: true,
        latencyMs: Date.now() - started,
      };
    }
  }
}
