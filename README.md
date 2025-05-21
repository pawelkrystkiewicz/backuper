# backuper

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run
```

## envs
Upon start, zod will validate provided envs

```sh

MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=my-buckets
DATABASES_CONFIG=inline-json-here
JOBS_FREQUENCY=daily
```

### DATABASES_CONFIG
Shape example
```ts
const DatabaseConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  database: z.string().min(1),
  destination: z.string().min(1),
})
```

---

This project was created using `bun init` in bun v1.2.10. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
