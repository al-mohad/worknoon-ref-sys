import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderStatus = 'processing' | 'in_transit' | 'delivered' | 'cancelled';

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true })
  sku!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true })
  unitPriceCents!: number;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ required: true, default: false })
  finalSale!: boolean;
}

@Schema({ _id: false })
export class Carrier {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  trackingNumber!: string;

  @Prop({ required: true })
  lastEvent!: string;
}

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber!: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Customer', index: true })
  customerId!: Types.ObjectId;

  @Prop({ required: true, enum: ['processing', 'in_transit', 'delivered', 'cancelled'] })
  status!: OrderStatus;

  @Prop({ required: true })
  placedAt!: Date;

  @Prop()
  shippedAt?: Date;

  @Prop()
  estimatedDeliveryAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop({ type: Carrier })
  carrier?: Carrier;

  @Prop({ required: true, type: [OrderItem] })
  items!: OrderItem[];

  @Prop({ required: true, default: 0 })
  shippingCents!: number;

  @Prop({ required: true })
  totalCents!: number;

  @Prop({ required: true, default: 'USD' })
  currency!: 'USD';
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ customerId: 1, placedAt: -1 });
