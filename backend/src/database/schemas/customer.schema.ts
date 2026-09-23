import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerTier = 'standard' | 'plus';

@Schema({ collection: 'customers', timestamps: true })
export class Customer {
  @Prop({ required: true, unique: true })
  customerNumber!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, enum: ['standard', 'plus'] })
  tier!: CustomerTier;

  @Prop({ required: true })
  memberSince!: Date;
}

export type CustomerDocument = HydratedDocument<Customer>;
export const CustomerSchema = SchemaFactory.createForClass(Customer);
