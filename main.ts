import { exec } from 'child_process'
import cliProgress from 'cli-progress'
import fs from 'fs'
import { Client } from 'minio'
import cron from 'node-cron'
import { config, jobsFrequency, type DatabaseConfig } from './config'

const minioClient = new Client({
  endPoint: config.MINIO_ENDPOINT,
  accessKey: config.MINIO_ACCESS_KEY,
  secretKey: config.MINIO_SECRET_KEY,
})

const BUCKET = config.MINIO_BUCKET

async function backupOneDB(db: DatabaseConfig) {
  if (!db?.destination) {
    console.error(`\n❌ Destination not set for ${db.database}`)
    return
  }

  console.log(`\nStarting backup for ${db.destination}`)
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
  bar.start(100, 0)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `/tmp/${db.database}_${timestamp}.sql.gz`
  const dumpCommand = `PGPASSWORD=${db.password} pg_dump -h ${db.host} -p ${db.port} -U ${db.user} ${db.database} | gzip > ${fileName}`
  const destPath = `${db.destination}/${timestamp}.sql.gz`

  exec(dumpCommand, async (err, stdout, stderr) => {
    console.info(stdout)
    bar.increment()

    if (err || stderr) {
      console.error(`\n❌ Backup failed for ${db.database}:`, err, stderr)

      return
    }

    console.log('✅ File created')
    bar.update(50)
    console.log('uploading to minio')
    await minioClient
      .fPutObject(BUCKET, destPath, fileName)
      .then(() => {
        console.log(`\n✅ Backup uploaded: ${db.database} → ${destPath}`)
        fs.unlinkSync(fileName)
        bar.update(100)
      })
      .catch(err => {
        console.error(`\n❌ MinIO upload failed for ${db.database}:`, err)
      })
  })

  bar.stop()
}

async function backupAll() {
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
  const total = config.databases.length
  bar.start(total, 0)
  for (const db of config.databases) {
    await backupOneDB(db)
    bar.increment()
  }
  bar.update(total)
  bar.stop()
}

const main = async () => {
  console.log(`\nStarting cron jobs with ${config.JOBS_FREQUENCY} frequency`)
  await cron.schedule(jobsFrequency[config.JOBS_FREQUENCY as keyof typeof jobsFrequency], backupAll)
}

main()
