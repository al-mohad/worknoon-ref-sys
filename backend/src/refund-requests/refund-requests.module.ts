import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { Clock } from '../common/clock.js';
import { CustomersModule } from '../customers/customers.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PolicyModule } from '../policy/policy.module.js';
import { AdminRefundRequestsController } from './admin-refund-requests.controller.js';
import { HistoryService } from './history.service.js';
import { RefundRequestsController } from './refund-requests.controller.js';
import { RefundRequestsRepository } from './refund-requests.repository.js';
import { RefundWorkflowService } from './refund-workflow.service.js';

@Module({
  imports: [DatabaseModule, CustomersModule, OrdersModule, AiModule, PolicyModule],
  controllers: [RefundRequestsController, AdminRefundRequestsController],
  providers: [RefundRequestsRepository, HistoryService, RefundWorkflowService, Clock],
})
export class RefundRequestsModule {}
