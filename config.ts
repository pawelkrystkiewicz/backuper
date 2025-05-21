import 'dotenv/config'
import { z } from 'zod'

const jobsFrequency = {
  hourly: '0 * * * *',
  daily: '0 0 * * *',
  weekly: '0 0 * * 0',
  monthly: '0 0 1 * *',
  yearly: '0 0 1 1 *',
}

// Schema for a single database config
const DatabaseConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  database: z.string().min(1),
  destination: z.string().min(1),
})

// Root schema
const EnvSchema = z.object({
  JOBS_FREQUENCY: z.string().transform((val, ctx) => {
    if (!jobsFrequency[val as keyof typeof jobsFrequency]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `CRON_TIME must be a valid cron time, got ${val}`,
      })
      return z.NEVER
    }
    return val
  }),
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),
  DATABASES_CONFIG: z.string().transform((val, ctx) => {
    const parsed = JSON.parse(JSON.stringify(val))
    try {
      return z.array(DatabaseConfigSchema).parse(parsed)
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `DATABASES_CONFIG must be a valid JSON array of database configs, got ${val}`,
      })
      return z.NEVER
    }
  }),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format())
  process.exit(1)
}

export const config = parsed.data

export type Config = z.infer<typeof EnvSchema>
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>
