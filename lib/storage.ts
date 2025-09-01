import { env } from './env.js'
import { TosClient, TosClientError, TosServerError } from '@volcengine/tos-sdk'
import path from 'node:path'
import fs from 'node:fs'
import cuid from 'cuid'

export async function uploadFile(file: string) {
  try {
    const client = getTosClient()
    const key = generateKey(file)
    await client.putObject({
      bucket: env.TOS_BUCKET,
      key,
      body: fs.createReadStream(file),
    })
    const endpoint = env.TOS_ENDPOINT
    return `https://${env.TOS_BUCKET}.${endpoint}/${key}`
  } catch (err) {
      throw handleError(err)
  }
}

function handleError(error: unknown) {
  if (error instanceof TosClientError) {
    return new Error(`Client Err Msg: ${error.message}, Client Err Stack: ${error.stack}`)
  } else if (error instanceof TosServerError) {
    return new Error(`Request ID: ${error.requestId}, Response Status Code: ${error.statusCode}, Response Header: ${error.headers}, Response Err Code: ${error.code}, Response Err Msg: ${error.message}`)
  } else {
    return new Error(`unexpected exception, message: ${error}`)
  }
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
