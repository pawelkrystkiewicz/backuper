import 'dotenv/config'
import { z } from 'zod'

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
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.coerce.number().int().min(1),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),
  DATABASES_CONFIG: z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val)
      return z.array(DatabaseConfigSchema).parse(parsed)
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DATABASES_CONFIG must be a valid JSON array of database configs',
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