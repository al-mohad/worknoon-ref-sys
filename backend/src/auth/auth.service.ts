import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { Model } from 'mongoose';
import { Agent, type AgentDocument } from '../database/schemas/agent.schema.js';
import { CustomersService } from '../customers/customers.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly customers: CustomersService,
    @InjectModel(Agent.name) private readonly agentModel: Model<Agent>,
  ) {}

  async signInCustomer(email: string) {
    const customer = await this.customers.findByEmail(email);
    if (!customer) {
      throw new NotFoundException('No customer with that email in the demo data set.');
    }
    const accessToken = this.jwt.sign({ sub: customer._id.toString(), role: 'customer', name: customer.name });
    return {
      accessToken,
      customer: {
        customerNumber: customer.customerNumber,
        name: customer.name,
        email: customer.email,
        tier: customer.tier,
      },
    };
  }

  async signInAgent(email: string, password: string) {
    const agent = await this.findAgentByEmail(email);
    const valid = agent ? await compare(password, agent.passwordHash) : false;
    if (!agent || !valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const accessToken = this.jwt.sign({ sub: agent._id.toString(), role: 'agent', name: agent.name });
    return { accessToken, agent: { name: agent.name, email: agent.email } };
  }

  private async findAgentByEmail(email: string): Promise<AgentDocument | null> {
    return this.agentModel.findOne({ email: email.toLowerCase().trim() });
  }
}
