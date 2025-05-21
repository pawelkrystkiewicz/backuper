# backuper

Backup your postgres to Minio

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
# Array of this size will be created to store your configs and iterate over
# Empty or 0 will fail
DB_COUNT=1
# DB config keys should available created from template DB_${INDEX}_HOST etc.
# Only postgres is supported
DB_0_HOST=
DB_0_PORT=
DB_0_USER=
DB_0_PASSWORD=
DB_0_DATABASE=
DB_0_DESTINATION=
```

---

This project was created using `bun init` in bun v1.2.10. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
