import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt-payload.js';
import { Roles } from '../common/roles.js';
import { OrdersService } from '../orders/orders.service.js';
import { CustomersService } from './customers.service.js';

@ApiTags('customer')
@ApiBearerAuth()
@Roles('customer')
@Controller('me')
export class MeController {
  constructor(
    private readonly customers: CustomersService,
    private readonly orders: OrdersService,
  ) {}

  @Get()
  async me(@CurrentUser() user: AuthenticatedUser) {
    const customer = await this.customers.findByIdOrThrow(user.id);
    return {
      customerNumber: customer.customerNumber,
      name: customer.name,
      email: customer.email,
      tier: customer.tier,
    };
  }

  @Get('orders')
  async orders_(@CurrentUser() user: AuthenticatedUser) {
    const customer = await this.customers.findByIdOrThrow(user.id);
    const orders = await this.orders.findByCustomer(customer._id);
    return orders.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      placedAt: order.placedAt,
      deliveredAt: order.deliveredAt ?? null,
      estimatedDeliveryAt: order.estimatedDeliveryAt ?? null,
      items: order.items.map((item) => ({
        sku: item.sku,
        name: item.name,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        finalSale: item.finalSale,
      })),
    }));
  }
}
