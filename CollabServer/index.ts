// ─────────────────────────────────────────────────────────────────
// COLLAB SERVER ENTRY POINT
// Boots a WebSocket server attached to an HTTP server so Render's
// reverse proxy can forward WebSocket upgrade requests correctly.
// ─────────────────────────────────────────────────────────────────

import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { handleMessage, handleDisconnect } from './connection-manager'
import { flushAllSessions, startPeriodicFlush, stopPeriodicFlush } from './persistence'
import redis from '../lib/redis'

const PORT = Number(process.env.PORT ?? process.env.COLLAB_PORT ?? 4001)
const REDIS_URL = process.env.REDIS_URL

if (!REDIS_URL) {
    throw new Error('REDIS_URL is required for CollabServer')
}

// HTTP server handles the WS upgrade — required for Render's reverse proxy.
const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('CollabServer OK')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
        handleMessage(ws, raw)
    })

    ws.on('close', () => {
        handleDisconnect(ws)
    })
})

server.listen(PORT, () => {
    console.log(`Collab server listening on port ${PORT}`)
    startPeriodicFlush()
})

void redis.ping().then(() => {
    console.log('Collab server connected to Redis')
}).catch((error) => {
    console.error('Redis connection check failed', error)
})

let isShuttingDown = false

async function shutdown(signal: string) {
    if (isShuttingDown) return
    isShuttingDown = true

    console.log(`Received ${signal}. Flushing collaboration sessions...`)
    stopPeriodicFlush()
    await flushAllSessions()

    await new Promise<void>((resolve) => {
        wss.close(() => resolve())
    })

    server.close()
    await redis.quit()
    process.exit(0)
}

process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT', () => { void shutdown('SIGINT') })
