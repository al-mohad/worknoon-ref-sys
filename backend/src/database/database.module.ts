import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Agent, AgentSchema } from './schemas/agent.schema.js';
import { Customer, CustomerSchema } from './schemas/customer.schema.js';
import { Order, OrderSchema } from './schemas/order.schema.js';
import { RefundRequest, RefundRequestSchema } from './schemas/refund-request.schema.js';

/** Registers every Mongoose model once; any feature module that needs one imports this. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
      { name: RefundRequest.name, schema: RefundRequestSchema },
      { name: Agent.name, schema: AgentSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
