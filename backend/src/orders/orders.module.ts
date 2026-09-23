import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
