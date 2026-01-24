import { serve } from '@hono/node-server'

import { app } from './api'
import { DEFAULT_PORT, DEFAULT_WS_PORT, log } from './config'
import { startWebSocketServer, stopWebSocketServer } from './websocket'

const httpPort = parseInt(process.env.SKILL_PORT || '', 10) || DEFAULT_PORT
const wsPort = parseInt(process.env.SKILL_WS_PORT || '', 10) || DEFAULT_WS_PORT

async function main() {
  log.info('Starting Skill Server...')

  // Start WebSocket server for extension connections
  try {
    await startWebSocketServer(wsPort)
  } catch (err) {
    log.error({ err, port: wsPort }, 'Failed to start WebSocket server')
    process.exit(1)
  }

  // Start HTTP server for API
  const server = serve({
    fetch: app.fetch,
    port: httpPort,
    hostname: '127.0.0.1'
  })

  log.info({ httpPort, wsPort }, 'Skill Server ready')
  log.info(`  HTTP API:   http://127.0.0.1:${httpPort}`)
  log.info(`  WebSocket:  ws://127.0.0.1:${wsPort}`)

  // Graceful shutdown
  const shutdown = () => {
    log.info('Shutting down...')
    stopWebSocketServer()
    server.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  log.error({ err }, 'Failed to start server')
  process.exit(1)
})
