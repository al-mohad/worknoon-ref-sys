import { Module } from '@nestjs/common';
import { loadPolicy, type PolicyDocument } from './policy-loader.js';
import { PolicyController } from './policy.controller.js';
import { POLICY_DOCUMENT } from './policy.tokens.js';

const policyDocumentProvider = {
  provide: POLICY_DOCUMENT,
  useFactory: (): PolicyDocument => loadPolicy(),
};

@Module({
  controllers: [PolicyController],
  providers: [policyDocumentProvider],
  exports: [POLICY_DOCUMENT],
})
export class PolicyModule {}
