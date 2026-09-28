import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Public } from '../auth/public.decorator.js';
import { AiStatusService } from '../ai/llm/ai-status.service.js';

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
    private readonly aiStatus: AiStatusService,
  ) {}

  @Get()
  get() {
    const dbState = CONNECTION_STATES[this.connection.readyState] ?? 'unknown';
    const ai = this.aiStatus.snapshot();
    return {
      status: dbState === 'connected' ? 'ok' : 'degraded',
      database: dbState,
      ai: { mode: ai.mode, provider: ai.provider, model: ai.model },
    };
  }
}
