import { z } from 'zod';

const blankIsMissing = <T extends z.ZodType>(schema: T) => z.preprocess((value) => value === '' ? undefined : value, schema.optional());

const schema = z.object({
  NODE_ENV: blankIsMissing(z.enum(['development', 'test', 'production'])).default('development'),
  API_PORT: blankIsMissing(z.coerce.number().int().min(1).max(65535)).default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: blankIsMissing(z.coerce.number().int().min(60).max(3600)).default(900),
  REFRESH_TOKEN_TTL_DAYS: blankIsMissing(z.coerce.number().int().min(1).max(90)).default(30),
  WEB_ORIGIN: z.string().url(),
  INITIAL_ADMIN_EMAIL: blankIsMissing(z.string().email().optional()),
  INITIAL_ADMIN_PASSWORD: blankIsMissing(z.string().min(12).optional()),
}).superRefine((env, ctx) => {
  if (Boolean(env.INITIAL_ADMIN_EMAIL) !== Boolean(env.INITIAL_ADMIN_PASSWORD)) {
    ctx.addIssue({ code: 'custom', message: 'Initial admin email and password must be set together.' });
  }
  if (env.NODE_ENV === 'production' && env.JWT_ACCESS_SECRET.length < 64) {
    ctx.addIssue({ code: 'custom', message: 'JWT access secret must be at least 64 characters in production.' });
  }
});

export type AppEnv = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid application environment: ${parsed.error.issues.map((issue) => issue.path.join('.') || issue.message).join(', ')}`);
  }
  return parsed.data;
}
