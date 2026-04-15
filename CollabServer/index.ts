// ─────────────────────────────────────────────────────────────────
// COLLAB SERVER ENTRY POINT
// Boots a WebSocket server and wires socket lifecycle events.
// ─────────────────────────────────────────────────────────────────

import { WebSocketServer } from "ws"
import { handleMessage, handleDisconnect } from "./connection-manager"

// Default to port 4001 unless overridden by environment.
const PORT = Number(process.env.COLLAB_PORT ?? 4001)

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