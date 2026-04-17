// ─────────────────────────────────────────────────────────────────
// COLLAB SERVER ENTRY POINT
// Boots a WebSocket server and wires socket lifecycle events.
// ─────────────────────────────────────────────────────────────────

import { WebSocketServer } from "ws"
import { handleMessage, handleDisconnect } from "./connection-manager"
import { flushAllSessions, startPeriodicFlush, stopPeriodicFlush } from "./persistence"
import redis from "@/lib/redis"

// Default to port 4001 unless overridden by environment.
const PORT = Number(process.env.COLLAB_PORT ?? 4001)
const REDIS_URL = process.env.REDIS_URL

if (!REDIS_URL) {
    throw new Error("REDIS_URL is required for CollabServer")
}

// Create the WS server for real-time collaboration traffic.
const wss = new WebSocketServer({ port: PORT })

// For each client connection, delegate message and disconnect handling.
wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
        handleMessage(ws, raw)
    })

    ws.on("close", () => {
        handleDisconnect(ws)
    })
})

// Startup log helps verify local server boot and chosen port.
console.log(`Collab server listening on ws://localhost:${PORT}`)
startPeriodicFlush()

void redis.ping().then(() => {
    console.log("Collab server connected to Redis")
}).catch((error) => {
    console.error("Redis connection check failed", error)
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

    await redis.quit()
    process.exit(0)
}

process.on("SIGTERM", () => {
    void shutdown("SIGTERM")
})

process.on("SIGINT", () => {
    void shutdown("SIGINT")
})