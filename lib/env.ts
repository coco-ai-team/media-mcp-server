import z from 'zod'

const envSchema = z.object({
  TOS_ACCESS_KEY: z.string(),
  TOS_SECRET_KEY: z.string(),
  TOS_BUCKET: z.string(),
  TOS_ENDPOINT: z.string(),
  TOS_REGION: z.string(),
})

const env = envSchema.parse(process.env)

export { env }
