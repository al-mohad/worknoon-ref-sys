import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, type OrderDocument } from '../database/schemas/order.schema.js';

@Injectable()
export class OrdersService {
  constructor(@InjectModel(Order.name) private readonly model: Model<Order>) {}

  async findByCustomer(customerId: Types.ObjectId): Promise<OrderDocument[]> {
    return this.model.find({ customerId }).sort({ placedAt: -1 });
  }

  /** Returns null rather than throwing so callers can treat "not this customer's order" as not found. */
  async findByOrderNumberForCustomer(
    orderNumber: string,
    customerId: Types.ObjectId,
  ): Promise<OrderDocument | null> {
    return this.model.findOne({ orderNumber, customerId });
  }

  async findByOrderNumberOrThrow(orderNumber: string): Promise<OrderDocument> {
    const order = await this.model.findOne({ orderNumber });
    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }
    return order;
  }
}
