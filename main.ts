import { exec } from 'child_process'
import cliProgress from 'cli-progress'
import fs from 'fs'
import { Client } from 'minio'
import cron from 'node-cron'
import { config, type DatabaseConfig } from './config'

const minioClient = new Client({
  endPoint: config.MINIO_ENDPOINT,
  accessKey: config.MINIO_ACCESS_KEY,
  secretKey: config.MINIO_SECRET_KEY,
})

const BUCKET = config.MINIO_BUCKET

async function backupOneDB(db: DatabaseConfig) {
  if (!db?.destination) {
    console.error(`❌ Destination not set for ${db.database}`)
    return
  }

  console.log(`Starting backup for ${db.destination}`)
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
  bar.start(100, 0)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `/tmp/${db.database}_${timestamp}.sql.gz`
  const dumpCommand = `PGPASSWORD=${db.password} pg_dump -h ${db.host} -p ${db.port} -U ${db.user} ${db.database} | gzip > ${fileName}`

  exec(dumpCommand, err => {
    bar.increment()
    if (err) {
      console.error(`❌ Backup failed for ${db.database}:`, err)
      bar.stop()
      return
    }

    const destPath = `${db.destination}/${timestamp}.sql.gz`

    minioClient
      .fPutObject(BUCKET, destPath, fileName)
      .then(() => {
        console.log(`✅ Backup uploaded: ${db.database} → ${destPath}`)
        fs.unlinkSync(fileName)
      })
      .catch(err => {
        console.error(`❌ MinIO upload failed for ${db.database}:`, err)
      })
      .finally(() => {
        bar.update(100)
        bar.stop()
      })
  })
}

async function backupAll() {
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
  const total = config.DATABASES_CONFIG.length
  bar.start(total, 0)
  for (const db of config.DATABASES_CONFIG) {
    await backupOneDB(db)
    bar.increment()
  }
  bar.update(total)
  bar.stop()
}

const main = async () => {
  console.log('Starting cron jobs')
  await cron.schedule('0 * * * *', backupAll)
}

main()
