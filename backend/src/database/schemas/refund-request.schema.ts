import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { REASON_CODES, REFUND_REASONS, RULE_IDS } from '../../policy/engine/types.js';

export type RequestStatus = 'collecting_info' | 'awaiting_review' | 'resolved';
export type MessageRole = 'customer' | 'assistant' | 'agent_note';

@Schema({ _id: false })
export class Message {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true, type: String, enum: ['customer', 'assistant', 'agent_note'] })
  role!: MessageRole;

  @Prop({ required: true })
  content!: string;

  @Prop({ required: true })
  createdAt!: Date;

  /** Only set on customer-sent messages; used to make a resubmitted POST a no-op. */
  @Prop()
  clientMessageId?: string;
}
const MessageSchema = SchemaFactory.createForClass(Message);

@Schema({ _id: false })
export class ClaimItemDoc {
  @Prop({ required: true })
  sku!: string;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true, type: String, enum: REFUND_REASONS })
  reason!: string;
}
const ClaimItemSchema = SchemaFactory.createForClass(ClaimItemDoc);

@Schema({ _id: false })
export class Claim {
  @Prop({ required: true, type: [ClaimItemSchema] })
  items!: ClaimItemDoc[];

  @Prop({ required: true })
  summary!: string;
}
const ClaimSchema = SchemaFactory.createForClass(Claim);

@Schema({ _id: false })
export class Signals {
  @Prop({
    required: true,
    type: { heuristic: Boolean, model: Boolean, notes: String },
    default: () => ({ heuristic: false, model: false }),
  })
  manipulation!: { heuristic: boolean; model: boolean; notes?: string };

  @Prop({ type: [String], default: [] })
  inconsistencies!: string[];
}
const SignalsSchema = SchemaFactory.createForClass(Signals);

@Schema({ _id: false })
export class CheckDoc {
  @Prop({ required: true, type: String, enum: RULE_IDS })
  rule!: string;

  @Prop({ required: true, type: String, enum: ['request', 'item'] })
  scope!: 'request' | 'item';

  @Prop()
  sku?: string;

  @Prop({ required: true, type: String, enum: ['pass', 'deny', 'escalate', 'not_applicable'] })
  result!: string;

  @Prop({ type: String, enum: REASON_CODES })
  code?: string;

  @Prop({ required: true })
  detail!: string;
}
const CheckSchema = SchemaFactory.createForClass(CheckDoc);

@Schema({ _id: false })
export class LineResultDoc {
  @Prop({ required: true })
  sku!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true, type: String, enum: REFUND_REASONS })
  reason!: string;

  @Prop({ required: true, type: String, enum: ['approved', 'denied', 'escalated'] })
  outcome!: string;

  @Prop({ type: [String], default: [] })
  reasonCodes!: string[];
}
const LineResultSchema = SchemaFactory.createForClass(LineResultDoc);

@Schema({ _id: false })
export class Evaluation {
  @Prop({ required: true })
  policyVersion!: string;

  @Prop({ required: true })
  evaluatedAt!: Date;

  @Prop({ required: true, type: Object })
  facts!: Record<string, unknown>;

  @Prop({ required: true, type: [CheckSchema] })
  checks!: CheckDoc[];

  @Prop({ required: true, type: [LineResultSchema] })
  lines!: LineResultDoc[];

  @Prop({ required: true })
  refundableCents!: number;

  @Prop({ required: true, default: 0 })
  claimedCents!: number;
}
const EvaluationSchema = SchemaFactory.createForClass(Evaluation);

@Schema({ _id: false })
export class Decision {
  @Prop({ required: true, type: String, enum: ['APPROVED', 'DENIED', 'ESCALATED'] })
  outcome!: 'APPROVED' | 'DENIED' | 'ESCALATED';

  @Prop({ type: [String], enum: REASON_CODES, default: [] })
  reasonCodes!: string[];

  @Prop({ required: true })
  decidedAt!: Date;
}
const DecisionSchema = SchemaFactory.createForClass(Decision);

@Schema({ _id: false })
export class ResolvedBy {
  @Prop({ required: true, type: String, enum: ['system', 'agent'] })
  type!: 'system' | 'agent';

  @Prop({ type: Types.ObjectId, ref: 'Agent' })
  agentId?: Types.ObjectId;

  @Prop()
  name?: string;
}
const ResolvedBySchema = SchemaFactory.createForClass(ResolvedBy);

@Schema({ _id: false })
export class Resolution {
  @Prop({ required: true, type: String, enum: ['APPROVED', 'DENIED'] })
  outcome!: 'APPROVED' | 'DENIED';

  @Prop({ required: true })
  refundCents!: number;

  @Prop({ required: true, type: ResolvedBySchema })
  resolvedBy!: ResolvedBy;

  @Prop()
  note?: string;

  @Prop({ required: true })
  resolvedAt!: Date;
}
const ResolutionSchema = SchemaFactory.createForClass(Resolution);

@Schema({ _id: false })
export class AiStep {
  @Prop({ required: true })
  step!: string;

  @Prop({ required: true, type: String, enum: ['anthropic', 'openai', 'heuristic'] })
  provider!: string;

  @Prop()
  model?: string;

  @Prop({ required: true, type: String, enum: ['ok', 'fallback', 'error'] })
  status!: string;

  @Prop({ default: false })
  usedFallback!: boolean;

  @Prop({ required: true })
  latencyMs!: number;

  @Prop({ type: { inputTokens: Number, outputTokens: Number, cacheReadTokens: Number } })
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number };

  @Prop({ required: true })
  createdAt!: Date;
}
const AiStepSchema = SchemaFactory.createForClass(AiStep);

@Schema({ _id: false })
export class TimelineEvent {
  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  detail!: string;

  @Prop({ required: true })
  at!: Date;
}
const TimelineEventSchema = SchemaFactory.createForClass(TimelineEvent);

@Schema({ collection: 'refund_requests', timestamps: true, optimisticConcurrency: true })
export class RefundRequest {
  @Prop({ required: true, unique: true })
  reference!: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Customer', index: true })
  customerId!: Types.ObjectId;

  @Prop()
  orderNumber?: string;

  @Prop({ required: true, type: String, enum: ['chat', 'email'], default: 'chat' })
  channel!: 'chat' | 'email';

  @Prop({
    required: true,
    type: String,
    enum: ['collecting_info', 'awaiting_review', 'resolved'],
    default: 'collecting_info',
    index: true,
  })
  status!: RequestStatus;

  @Prop({ required: true, type: [MessageSchema], default: [] })
  messages!: Message[];

  @Prop({ type: ClaimSchema })
  claim?: Claim;

  @Prop({ required: true, type: SignalsSchema, default: () => ({}) })
  signals!: Signals;

  @Prop({ type: EvaluationSchema })
  evaluation?: Evaluation;

  @Prop({ type: DecisionSchema })
  decision?: Decision;

  @Prop({ type: ResolutionSchema })
  resolution?: Resolution;

  @Prop({ required: true, type: [AiStepSchema], default: [] })
  aiSteps!: AiStep[];

  @Prop({ required: true, type: [TimelineEventSchema], default: [] })
  timeline!: TimelineEvent[];

  @Prop({ required: true, default: 0 })
  clarificationCount!: number;

  /** Set once, when a customer asks a person to look again at an automatic denial. */
  @Prop()
  reviewRequestedAt?: Date;
}

export type RefundRequestDocument = HydratedDocument<RefundRequest>;
export const RefundRequestSchema = SchemaFactory.createForClass(RefundRequest);
RefundRequestSchema.index({ customerId: 1, createdAt: -1 });
RefundRequestSchema.index({ status: 1, createdAt: -1 });
RefundRequestSchema.index({ orderNumber: 1 });
