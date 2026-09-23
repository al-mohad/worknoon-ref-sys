import { z } from 'zod';

/**
 * Every setting the app reads from the environment, validated once at boot.
 * A bad or missing value fails fast with a readable message instead of
 * surfacing as an obscure runtime error three requests later.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),

  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/refund_desk'),

  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters')
    .default('refund-desk-demo-secret-change-me'),
  JWT_TTL: z.string().default('2h'),

  AGENT_EMAIL: z.string().email().default('agent@example.com'),
  AGENT_PASSWORD: z.string().min(8).default('refund-desk-demo'),

  LLM_PROVIDER: z.enum(['anthropic', 'openai', 'none', 'auto']).default('auto'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5-mini'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
