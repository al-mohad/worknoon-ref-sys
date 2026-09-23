import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Public } from '../auth/public.decorator.js';
import { LLM_CLIENT, type LlmClient } from '../ai/llm/llm-client.port.js';

const CONNECTION_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
  ) {}

  @Get()
  get() {
    const dbState = CONNECTION_STATES[this.connection.readyState] ?? 'unknown';
    return {
      status: dbState === 'connected' ? 'ok' : 'degraded',
      database: dbState,
      ai: { provider: this.llm.provider, model: this.llm.model, mode: this.llm.model === 'none' ? 'rules_only' : 'live' },
    };
  }
}
