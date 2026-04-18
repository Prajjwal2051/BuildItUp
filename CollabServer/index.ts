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
    // Start self-ping only after the server is ready to accept requests.
    startSelfPing()
})

void redis.ping().then(() => {
    console.log('Collab server connected to Redis')
}).catch((error) => {
    console.error('Redis connection check failed', error)
})

// ─────────────────────────────────────────────────────────────────
// SELF-PING — prevents Render free-tier spin-down.
// Pings the public external URL (injected by Render as RENDER_EXTERNAL_URL)
// so the request counts as real inbound traffic.
// Falls back to localhost only in local dev where sleep is not a concern.
// ─────────────────────────────────────────────────────────────────
let selfPingTimer: ReturnType<typeof setInterval> | null = null

function startSelfPing(intervalMs = 14 * 60 * 1000) {
    // RENDER_EXTERNAL_URL is automatically set by Render (e.g. https://colabserver-bt3g.onrender.com).
    // localhost pings do NOT count as inbound traffic and will NOT prevent sleep.
    const pingUrl = process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${PORT}/`

    if (!process.env.RENDER_EXTERNAL_URL) {
        console.log('RENDER_EXTERNAL_URL not set — self-ping will use localhost (dev mode, sleep prevention inactive)')
    } else {
        console.log(`Self-ping active → ${pingUrl} every ${intervalMs / 1000}s`)
    }

    selfPingTimer = setInterval(async () => {
        try {
            const res = await fetch(pingUrl, { signal: AbortSignal.timeout(10_000) })
            console.log(`Self-ping OK (${res.status})`)
        } catch (err) {
            console.warn('Self-ping failed', err)
        }
    }, intervalMs)
}

function stopSelfPing() {
    if (selfPingTimer !== null) {
        clearInterval(selfPingTimer)
        selfPingTimer = null
    }
}

let isShuttingDown = false

async function shutdown(signal: string) {
    if (isShuttingDown) return
    isShuttingDown = true

    console.log(`Received ${signal}. Flushing collaboration sessions...`)
    stopPeriodicFlush()
    stopSelfPing()
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
