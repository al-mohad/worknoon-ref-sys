import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { CustomersService } from './customers.service.js';
import { MeController } from './me.controller.js';

@Module({
  imports: [DatabaseModule, OrdersModule],
  controllers: [MeController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
