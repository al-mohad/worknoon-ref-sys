import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { hash } from 'bcryptjs';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { ProblemDetailsFilter } from '../src/common/problem-details.filter.js';
import { LLM_CLIENT, LlmUnavailableError, type LlmClient } from '../src/ai/llm/llm-client.port.js';

process.env.MONGODB_URI = process.env.MONGODB_URI_E2E ?? 'mongodb://localhost:27017/refund_desk_e2e_test';
process.env.ANTHROPIC_API_KEY = '';
process.env.OPENAI_API_KEY = '';

// Rules-only mode for every e2e run: no network calls, deterministic
// behavior, and it exercises the same fallback path the app uses when no
// provider key is configured - already covered manually against a real
// key, so this suite focuses on auth, guards and the API contract.
const fakeLlm: LlmClient = {
  provider: 'anthropic',
  model: 'e2e-fake',
  async callTool() {
    throw new LlmUnavailableError('e2e run - rules-only mode');
  },
  async complete() {
    throw new LlmUnavailableError('e2e run - rules-only mode');
  },
};

describe('Refund Desk API (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(LLM_CLIENT)
      .useValue(fakeLlm)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();

    connection = app.get(getConnectionToken());
    await connection.dropDatabase();

    const customers = connection.collection('customers');
    const orders = connection.collection('orders');
    const agents = connection.collection('agents');

    const { insertedId: amaraId } = await customers.insertOne({
      customerNumber: 'CUS-1001',
      name: 'Amara Okafor',
      email: 'amara.e2e@example.com',
      tier: 'standard',
      memberSince: new Date(),
    });
    await customers.insertOne({
      customerNumber: 'CUS-1002',
      name: 'Daniel Kim',
      email: 'daniel.e2e@example.com',
      tier: 'standard',
      memberSince: new Date(),
    });

    await orders.insertOne({
      orderNumber: 'ORD-90001',
      customerId: amaraId,
      status: 'delivered',
      placedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      estimatedDeliveryAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      items: [{ sku: 'E2E-1', name: 'Test widget', category: 'Test', unitPriceCents: 4_800, quantity: 1, finalSale: false }],
      shippingCents: 0,
      totalCents: 4_800,
      currency: 'USD',
    });

    await orders.insertOne({
      orderNumber: 'ORD-90002',
      customerId: amaraId,
      status: 'delivered',
      placedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      items: [{ sku: 'E2E-2', name: 'Expensive widget', category: 'Test', unitPriceCents: 60_000, quantity: 1, finalSale: false }],
      shippingCents: 0,
      totalCents: 60_000,
      currency: 'USD',
    });

    await orders.insertOne({
      orderNumber: 'ORD-90003',
      customerId: amaraId,
      status: 'delivered',
      placedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      items: [{ sku: 'E2E-3', name: 'Second widget', category: 'Test', unitPriceCents: 4_800, quantity: 1, finalSale: false }],
      shippingCents: 0,
      totalCents: 4_800,
      currency: 'USD',
    });

    await orders.insertOne({
      orderNumber: 'ORD-90004',
      customerId: amaraId,
      status: 'delivered',
      placedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      items: [{ sku: 'E2E-4', name: 'Silk scarf', category: 'Test', unitPriceCents: 6_500, quantity: 1, finalSale: true }],
      shippingCents: 0,
      totalCents: 6_500,
      currency: 'USD',
    });

    await agents.insertOne({
      name: 'Test Agent',
      email: 'agent.e2e@example.com',
      passwordHash: await hash('super-secret-pw', 10),
    });
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await app.close();
  });

  // Sign-in is throttled per IP, so tokens are reused across tests
  // rather than signing in again each time.
  const tokens = new Map<string, string>();

  async function customerToken(email: string): Promise<string> {
    if (!tokens.has(email)) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/customer-sessions')
        .send({ email });
      tokens.set(email, res.body.accessToken);
    }
    return tokens.get(email)!;
  }

  async function agentToken(): Promise<string> {
    if (!tokens.has('agent')) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/agent-sessions')
        .send({ email: 'agent.e2e@example.com', password: 'super-secret-pw' });
      tokens.set('agent', res.body.accessToken);
    }
    return tokens.get('agent')!;
  }

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer()).get('/api/v1/me').expect(401);
  });

  it('returns RFC 9457 problem details for a 404', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/customer-sessions')
      .send({ email: 'nobody@example.com' })
      .expect(404);

    expect(res.body).toMatchObject({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
    });
    expect(res.body.requestId).toBeTruthy();
    expect(res.body.instance).toBe('/api/v1/auth/customer-sessions');
  });

  it('returns a validation problem for a malformed body', async () => {
    const token = await customerToken('amara.e2e@example.com');
    const res = await request(app.getHttpServer())
      .post('/api/v1/refund-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 12345 })
      .expect(400);
    expect(res.body.status).toBe(400);
  });

  it('rejects a customer token on an agent-only route', async () => {
    const token = await customerToken('amara.e2e@example.com');
    await request(app.getHttpServer())
      .get('/api/v1/admin/metrics')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('never lets one customer see another customer\'s refund request', async () => {
    const amara = await customerToken('amara.e2e@example.com');
    const daniel = await customerToken('daniel.e2e@example.com');

    const created = await request(app.getHttpServer())
      .post('/api/v1/refund-requests')
      .set('Authorization', `Bearer ${amara}`)
      .send({ message: 'My widget from ORD-90001 arrived cracked' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/refund-requests/${created.body.reference}`)
      .set('Authorization', `Bearer ${daniel}`)
      .expect(404);
  });

  it('runs the full approve -> escalate -> agent-resolve flow', async () => {
    const amara = await customerToken('amara.e2e@example.com');

    const approved = await request(app.getHttpServer())
      .post('/api/v1/refund-requests')
      .set('Authorization', `Bearer ${amara}`)
      .send({ message: 'My widget from ORD-90003 arrived damaged' })
      .expect(201);
    expect(approved.body.status).toBe('resolved');
    expect(approved.body.decision.outcome).toBe('APPROVED');

    const escalated = await request(app.getHttpServer())
      .post('/api/v1/refund-requests')
      .set('Authorization', `Bearer ${amara}`)
      .send({ message: 'The expensive widget from ORD-90002 arrived damaged' })
      .expect(201);
    expect(escalated.body.status).toBe('awaiting_review');
    expect(escalated.body.decision.outcome).toBe('ESCALATED');

    const agent = await agentToken();
    const resolved = await request(app.getHttpServer())
      .post(`/api/v1/admin/refund-requests/${escalated.body.reference}/resolution`)
      .set('Authorization', `Bearer ${agent}`)
      .send({ outcome: 'APPROVED', note: 'Confirmed with the customer over a follow-up call.' })
      .expect(201);
    expect(resolved.body.status).toBe('resolved');
    expect(resolved.body.resolution.outcome).toBe('APPROVED');

    await request(app.getHttpServer())
      .post(`/api/v1/admin/refund-requests/${escalated.body.reference}/resolution`)
      .set('Authorization', `Bearer ${agent}`)
      .send({ outcome: 'APPROVED', note: 'Trying to resolve it twice.' })
      .expect(409);
  });

  it('lets a customer send an automatic denial to an agent once, and pays the claim if approved', async () => {
    const amara = await customerToken('amara.e2e@example.com');

    const denied = await request(app.getHttpServer())
      .post('/api/v1/refund-requests')
      .set('Authorization', `Bearer ${amara}`)
      .send({ message: 'I changed my mind about the scarf from ORD-90004' })
      .expect(201);
    expect(denied.body.decision.outcome).toBe('DENIED');
    expect(denied.body.canRequestReview).toBe(true);

    const underReview = await request(app.getHttpServer())
      .post(`/api/v1/refund-requests/${denied.body.reference}/review-request`)
      .set('Authorization', `Bearer ${amara}`)
      .expect(201);
    expect(underReview.body.status).toBe('awaiting_review');
    expect(underReview.body.canRequestReview).toBe(false);

    await request(app.getHttpServer())
      .post(`/api/v1/refund-requests/${denied.body.reference}/review-request`)
      .set('Authorization', `Bearer ${amara}`)
      .expect(409);

    const agent = await agentToken();
    const resolved = await request(app.getHttpServer())
      .post(`/api/v1/admin/refund-requests/${denied.body.reference}/resolution`)
      .set('Authorization', `Bearer ${agent}`)
      .send({ outcome: 'APPROVED', note: 'Scarf was mislabeled as final sale on the product page.' })
      .expect(201);
    expect(resolved.body.resolution.refundCents).toBe(6_500);
    expect(resolved.body.decision.outcome).toBe('DENIED');
  });

  it('hands a conversation to an agent when it reaches the message limit without a claim', async () => {
    const daniel = await customerToken('daniel.e2e@example.com');
    const created = await request(app.getHttpServer())
      .post('/api/v1/refund-requests')
      .set('Authorization', `Bearer ${daniel}`)
      .send({})
      .expect(201);

    let latest = created.body;
    for (let turn = 1; turn <= 6; turn++) {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/refund-requests/${created.body.reference}/messages`)
        .set('Authorization', `Bearer ${daniel}`)
        .send({ content: 'Can you list my orders?', clientMessageId: randomUUID() })
        .expect(201);
      latest = res.body;
      if (turn < 6) expect(latest.status).toBe('collecting_info');
    }

    expect(latest.status).toBe('awaiting_review');
    expect(latest.messages).toHaveLength(12);
  });

  it('reports rules-only AI mode on the health check when no provider is configured', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.ai.mode).toBe('rules_only');
  });
});
