import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Types } from 'mongoose';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt-payload.js';
import { Roles } from '../common/roles.js';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { RefundRequestsRepository } from './refund-requests.repository.js';
import { RefundWorkflowService } from './refund-workflow.service.js';
import { toCustomerSummary, toCustomerView } from './views/customer-view.js';

@ApiTags('customer')
@ApiBearerAuth()
@Roles('customer')
@Controller('refund-requests')
export class RefundRequestsController {
  constructor(
    private readonly workflow: RefundWorkflowService,
    private readonly repo: RefundRequestsRepository,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const requests = await this.repo.findByCustomer(new Types.ObjectId(user.id));
    return requests.map(toCustomerSummary);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRefundRequestDto) {
    const request = await this.workflow.createRequest(new Types.ObjectId(user.id), dto.message);
    return toCustomerView(request);
  }

  @Get(':reference')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('reference') reference: string) {
    const request = await this.repo.findByReferenceForCustomer(reference, new Types.ObjectId(user.id));
    if (!request) {
      throw new NotFoundException(`Refund request ${reference} not found`);
    }
    return toCustomerView(request);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(':reference/messages')
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reference') reference: string,
    @Body() dto: SendMessageDto,
  ) {
    const request = await this.workflow.handleMessage(
      new Types.ObjectId(user.id),
      reference,
      dto.content,
      dto.clientMessageId,
    );
    return toCustomerView(request);
  }
}
