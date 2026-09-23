import { Module } from '@nestjs/common';
import { canaryTokenProvider } from './canary.js';
import { ClaimExtractorService } from './extraction/claim-extractor.service.js';
import { HeuristicExtractor } from './extraction/heuristic-extractor.js';
import { LlmModule } from './llm/llm.module.js';
import { ReplyWriterService } from './replies/reply-writer.service.js';

@Module({
  imports: [LlmModule],
  providers: [canaryTokenProvider, HeuristicExtractor, ClaimExtractorService, ReplyWriterService],
  exports: [ClaimExtractorService, ReplyWriterService],
})
export class AiModule {}
