import { Controller, Get, Param, Post, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt-payload.js';
import { Roles } from '../common/roles.js';
import { CustomersService } from '../customers/customers.service.js';
import { AdminListQueryDto } from './dto/admin-list-query.dto.js';
import { ResolveRequestDto } from './dto/resolve-request.dto.js';
import { RefundRequestsRepository } from './refund-requests.repository.js';
import { RefundWorkflowService } from './refund-workflow.service.js';
import { toAdminDetail, toAdminListItem } from './views/admin-view.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('admin')
@ApiBearerAuth()
@Roles('agent')
@Controller('admin')
export class AdminRefundRequestsController {
  constructor(
    private readonly repo: RefundRequestsRepository,
    private readonly workflow: RefundWorkflowService,
    private readonly customers: CustomersService,
  ) {}

  @Get('refund-requests')
  async list(@Query() query: AdminListQueryDto) {
    const { items, nextCursor } = await this.repo.listForAdmin(query);
    const customerById = await this.loadCustomerLabels(items.map((item) => item.customerId));
    return {
      items: items.map((item) => toAdminListItem(item, customerById.get(item.customerId.toString()) ?? 'Unknown')),
      nextCursor,
    };
  }

  @Get('refund-requests/:reference')
  async detail(@Param('reference') reference: string) {
    const request = await this.repo.findByReferenceOrThrow(reference);
    const customer = await this.customers.findByIdOrThrow(request.customerId.toString());
    return toAdminDetail(request, customer);
  }

  @Post('refund-requests/:reference/resolution')
  async resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reference') reference: string,
    @Body() dto: ResolveRequestDto,
  ) {
    const request = await this.workflow.resolveByAgent(
      reference,
      new Types.ObjectId(user.id),
      user.name,
      dto.outcome,
      dto.note,
    );
    const customer = await this.customers.findByIdOrThrow(request.customerId.toString());
    return toAdminDetail(request, customer);
  }

  @Get('metrics')
  async metrics() {
    const since = new Date(Date.now() - SEVEN_DAYS_MS);
    const { total, byOutcome, byStatus, flagged } = await this.repo.recentMetrics(since);
    const outcomeCount = (outcome: string) => byOutcome.find((row) => row._id === outcome)?.count ?? 0;
    const statusCount = (status: string) => byStatus.find((row) => row._id === status)?.count ?? 0;
    const resolved = outcomeCount('APPROVED') + outcomeCount('DENIED') + outcomeCount('ESCALATED');
    const autoResolved = outcomeCount('APPROVED') + outcomeCount('DENIED');

    return {
      windowDays: 7,
      total,
      approved: outcomeCount('APPROVED'),
      denied: outcomeCount('DENIED'),
      escalated: outcomeCount('ESCALATED'),
      awaitingReview: statusCount('awaiting_review'),
      flagged,
      autoResolutionRate: resolved > 0 ? Math.round((autoResolved / resolved) * 100) : 0,
    };
  }

  private async loadCustomerLabels(customerIds: Types.ObjectId[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(customerIds.map((id) => id.toString()))];
    const customers = await Promise.all(uniqueIds.map((id) => this.customers.findByIdOrThrow(id).catch(() => null)));
    const map = new Map<string, string>();
    customers.forEach((customer, index) => {
      if (customer) map.set(uniqueIds[index], `${customer.name} (${customer.email})`);
    });
    return map;
  }
}
