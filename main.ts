import { exec } from 'child_process'
import fs from 'fs'
import { Client } from 'minio'
import cron from 'node-cron'
import { config, type Config } from './config'
import cliProgress from 'cli-progress'

const minioClient = new Client({
  endPoint: config.MINIO_ENDPOINT,
  accessKey: config.MINIO_ACCESS_KEY,
  secretKey: config.MINIO_SECRET_KEY,
  useSSL: config.MINIO_ENDPOINT.startsWith('https'),
})

const BUCKET = config.MINIO_BUCKET

function backupOneDB(config: Config['DATABASES_CONFIG'][number]) {
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
  bar.start(100, 0)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `/tmp/${config.database}_${timestamp}.sql.gz`
  const dumpCommand = `PGPASSWORD=${config.password} pg_dump -h ${config.host} -p ${config.port} -U ${config.user} ${config.database} | gzip > ${fileName}`

  exec(dumpCommand, err => {
    bar.increment()
    if (err) {
      console.error(`❌ Backup failed for ${config.database}:`, err)
      bar.stop()
      return
    }

    const destPath = `${config.destination}/${timestamp}.sql.gz`

    minioClient
      .fPutObject(BUCKET, destPath, fileName)
      .then(() => {
        console.log(`✅ Backup uploaded: ${config.database} → ${destPath}`)
        fs.unlinkSync(fileName)
      })
      .catch(err => {
        console.error(`❌ MinIO upload failed for ${config.database}:`, err)
      })
      .finally(() => {
        bar.update(100)
        bar.stop()
      })
  })
}

function backupAll() {
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
  const total = config.DATABASES_CONFIG.length
  bar.start(total, 0)
  config.DATABASES_CONFIG.forEach(config => {
    backupOneDB(config)
    bar.increment()
  })
  bar.update(total)
  bar.stop()
}

// Schedule
cron.schedule('0 * * * *', backupAll)
