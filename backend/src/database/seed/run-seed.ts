import { hash } from 'bcryptjs';
import mongoose from 'mongoose';
import { AgentSchema } from '../schemas/agent.schema.js';
import { CustomerSchema } from '../schemas/customer.schema.js';
import { OrderSchema } from '../schemas/order.schema.js';
import { RefundRequestSchema } from '../schemas/refund-request.schema.js';
import { CUSTOMERS, HISTORICAL_REFUNDS, ORDERS } from './seed-data.js';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/refund_desk';
const AGENT_EMAIL = process.env.AGENT_EMAIL ?? 'agent@example.com';
const AGENT_PASSWORD = process.env.AGENT_PASSWORD ?? 'refund-desk-demo';
const RESET = process.argv.includes('--reset');

const now = new Date();
function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log(`Connecting to ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);

  const CustomerModel = mongoose.model('Customer', CustomerSchema);
  const OrderModel = mongoose.model('Order', OrderSchema);
  const AgentModel = mongoose.model('Agent', AgentSchema);
  const RefundRequestModel = mongoose.model('RefundRequest', RefundRequestSchema);

  if (RESET) {
    console.log('Resetting customers, orders, agents and refund requests...');
    await Promise.all([
      CustomerModel.deleteMany({}),
      OrderModel.deleteMany({}),
      AgentModel.deleteMany({}),
      RefundRequestModel.deleteMany({}),
    ]);
  }

  const customerIdByKey = new Map<string, mongoose.Types.ObjectId>();
  for (const [index, customer] of CUSTOMERS.entries()) {
    const doc = await CustomerModel.findOneAndUpdate(
      { email: customer.email },
      {
        $set: {
          customerNumber: `CUS-${1001 + index}`,
          name: customer.name,
          email: customer.email,
          tier: customer.tier,
          memberSince: daysAgo(customer.memberSinceDaysAgo),
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
    customerIdByKey.set(customer.key, doc._id);
  }
  console.log(`Upserted ${CUSTOMERS.length} customers.`);

  const orderIdByKey = new Map<string, mongoose.Types.ObjectId>();
  for (const order of ORDERS) {
    const customerId = customerIdByKey.get(order.customerKey);
    if (!customerId) throw new Error(`Unknown customer key ${order.customerKey} on order ${order.orderNumber}`);

    const items = order.items.map((item) => ({ ...item, finalSale: item.finalSale ?? false }));
    const shippingCents = order.shippingCents ?? 0;
    const totalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0) + shippingCents;

    const doc = await OrderModel.findOneAndUpdate(
      { orderNumber: order.orderNumber },
      {
        $set: {
          orderNumber: order.orderNumber,
          customerId,
          status: order.status,
          placedAt: daysAgo(order.placedDaysAgo),
          shippedAt: order.shippedDaysAgo !== undefined ? daysAgo(order.shippedDaysAgo) : undefined,
          estimatedDeliveryAt:
            order.estimatedDeliveryDaysAgo !== undefined ? daysAgo(order.estimatedDeliveryDaysAgo) : undefined,
          deliveredAt: order.deliveredDaysAgo !== undefined ? daysAgo(order.deliveredDaysAgo) : undefined,
          carrier: order.carrier,
          items,
          shippingCents,
          totalCents,
          currency: 'USD',
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
    orderIdByKey.set(order.key, doc._id);
  }
  console.log(`Upserted ${ORDERS.length} orders.`);

  const passwordHash = await hash(AGENT_PASSWORD, 10);
  await AgentModel.findOneAndUpdate(
    { email: AGENT_EMAIL },
    { $set: { name: 'Jordan Reyes', email: AGENT_EMAIL, passwordHash } },
    { upsert: true },
  );
  console.log(`Upserted support agent ${AGENT_EMAIL}.`);

  for (const refund of HISTORICAL_REFUNDS) {
    const customerId = customerIdByKey.get(refund.customerKey);
    const order = ORDERS.find((o) => o.key === refund.orderKey);
    if (!customerId || !order) throw new Error(`Bad historical refund reference: ${refund.orderKey}`);

    const resolvedAt = daysAgo(refund.resolvedDaysAgo);
    await RefundRequestModel.findOneAndUpdate(
      { reference: `RF-HIST-${order.orderNumber}` },
      {
        $set: {
          reference: `RF-HIST-${order.orderNumber}`,
          customerId,
          orderNumber: order.orderNumber,
          channel: 'email',
          status: 'resolved',
          messages: [],
          claim: { items: [{ sku: refund.sku, quantity: refund.quantity, reason: 'defective' }], summary: 'Handled over email before this system existed.' },
          signals: { manipulation: { heuristic: false, model: false }, inconsistencies: [] },
          evaluation: {
            policyVersion: 'pre-system',
            evaluatedAt: resolvedAt,
            facts: {},
            checks: [],
            lines: [
              {
                sku: refund.sku,
                name: refund.itemName,
                quantity: refund.quantity,
                reason: 'defective',
                outcome: 'approved',
                reasonCodes: [],
              },
            ],
            refundableCents: refund.refundCents,
          },
          decision: { outcome: 'APPROVED', reasonCodes: [], decidedAt: resolvedAt },
          resolution: {
            outcome: 'APPROVED',
            refundCents: refund.refundCents,
            resolvedBy: refund.resolvedByAgent
              ? { type: 'agent', name: 'Jordan Reyes' }
              : { type: 'system' },
            note: 'Historical record seeded for the refund-frequency and already-refunded scenarios.',
            resolvedAt,
          },
          aiSteps: [],
          timeline: [{ type: 'resolved_by_agent', detail: 'Historical record.', at: resolvedAt }],
          clarificationCount: 0,
        },
      },
      { upsert: true },
    );
  }
  console.log(`Upserted ${HISTORICAL_REFUNDS.length} historical refund records.`);

  await mongoose.disconnect();
  console.log('Seed complete.');
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
