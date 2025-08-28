import { env } from './env.js'
import { TosClient } from '@volcengine/tos-sdk'
import path from 'node:path'
import fs from 'node:fs'
import cuid from 'cuid'

export async function uploadFile(file: string) {
  const client = getTosClient()
  const key = generateKey(file)
  await client.putObject({
    bucket: env.TOS_BUCKET,
    key,
    body: fs.createReadStream(file),
  })
  const endpoint = env.TOS_ENDPOINT
  return `https://${env.TOS_BUCKET}.${endpoint}/${key}`
}

function getTosClient() {
  return new TosClient({
    accessKeyId: env.TOS_ACCESS_KEY,
    accessKeySecret: env.TOS_SECRET_KEY,
    region: env.TOS_REGION,
    endpoint: env.TOS_ENDPOINT,
  })
}

function generateKey(file: string) {
  const fileExt = path.extname(file)
  const dateStr = new Date().toISOString().split('T')[0]
  return `media_agent/${dateStr}/${cuid()}${fileExt}`
}
