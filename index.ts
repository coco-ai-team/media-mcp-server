#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { program } from 'commander'
import express from 'express'
import MCPServerFactory from './lib/index.js'

const SERVER_NAME = 'media-mcp-server'
const SERVER_VERSION = '1.0.0-beta.4'

async function startStdIOServer(
  createServer: Awaited<ReturnType<typeof MCPServerFactory>>,
) {
  console.error('Starting default (STDIO) server...')
  const transport = new StdioServerTransport()
  const server = createServer()
  await server.connect(transport)
}

async function startServerSSE(
  host: string,
  port: number,
  createServer: Awaited<ReturnType<typeof MCPServerFactory>>,
) {
  console.error('Starting SSE server...')

  const app = express()

  const transports: Map<string, SSEServerTransport> = new Map<
    string,
    SSEServerTransport
  >()

  app.get('/sse', async (req, res) => {
    let transport: SSEServerTransport

    const server = createServer()

    if (req?.query?.sessionId) {
      const sessionId = req?.query?.sessionId as string
      transport = transports.get(sessionId) as SSEServerTransport
      console.error(
        "Client Reconnecting? This shouldn't happen; when client has a sessionId, GET /sse should not be called again.",
        transport.sessionId,
      )
    } else {
      // Create and store transport for new session
      transport = new SSEServerTransport('/message', res)
      transports.set(transport.sessionId, transport)

      // Connect server to transport
      await server.connect(transport)
      console.error('Client Connected: ', transport.sessionId)

      // Handle close of connection
      server.onclose = async () => {
        console.error('Client Disconnected: ', transport.sessionId)
        transports.delete(transport.sessionId)
      }
    }
  })

  app.post('/message', async (req, res) => {
    const sessionId = req?.query?.sessionId as string
    const transport = transports.get(sessionId)
    if (transport) {
      console.error('Client Message from', sessionId)
      await transport.handlePostMessage(req, res)
    } else {
      console.error(`No transport found for sessionId ${sessionId}`)
    }
  })

  app.listen(port, host, () => {
    console.error(`Server is running on ${host}:${port}`)
  })
}

async function main() {
  program
    .option('--sse', 'Start SSE Server')
    .option('-h, --host <host>', 'The host of the mcp server', '127.0.0.1')
    .option('-p, --port <port>', 'The port of the mcp server', '5000')
    .parse()

  const createServer = await MCPServerFactory(SERVER_NAME, SERVER_VERSION)

  const options = program.opts()
  try {
    if (options.sse) {
      await startServerSSE(options.host, Number(options.port), createServer)
    } else {
      await startStdIOServer(createServer)
    }
  } catch (error) {
    console.error('Error during server startup:', error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error in main execution:', error)
  process.exit(1)
})
