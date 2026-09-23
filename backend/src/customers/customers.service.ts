import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, type CustomerDocument } from '../database/schemas/customer.schema.js';

@Injectable()
export class CustomersService {
  constructor(@InjectModel(Customer.name) private readonly model: Model<Customer>) {}

  async findByEmail(email: string): Promise<CustomerDocument | null> {
    return this.model.findOne({ email: email.toLowerCase().trim() });
  }

  async findByIdOrThrow(id: string): Promise<CustomerDocument> {
    const customer = Types.ObjectId.isValid(id) ? await this.model.findById(id) : null;
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async list(): Promise<CustomerDocument[]> {
    return this.model.find().sort({ customerNumber: 1 });
  }
}
