import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator.js';
import type { PolicyDocument } from './policy-loader.js';
import { POLICY_DOCUMENT } from './policy.tokens.js';

@ApiTags('policy')
@Public()
@Controller('policy')
export class PolicyController {
  constructor(@Inject(POLICY_DOCUMENT) private readonly doc: PolicyDocument) {}

  @Get()
  get() {
    return { version: this.doc.policy.version, markdown: this.doc.markdown };
  }
}
