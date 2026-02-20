const WebSocket = require("ws");

let wss = null;
const clients = new Set();

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    clients.add(ws);
    console.log(`[WS] Client connected. Total: ${clients.size}`);

    // Send current pool state on connect
    const store = require("./store");
    ws.send(
      JSON.stringify({
        type: "init",
        data: {
          pools: Object.fromEntries(store.pools),
          recentPrizes: Array.from(store.prizes.values()).slice(-5),
        },
      })
    );

    ws.on("message", (msg) => {
      try {
        const { type, data } = JSON.parse(msg.toString());
        // Handle client subscriptions if needed
        if (type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected. Total: ${clients.size}`);
    });

    ws.on("error", (err) => {
      console.error("[WS] Error:", err.message);
      clients.delete(ws);
    });
  });

  // Heartbeat every 30s
  setInterval(() => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      } else {
        clients.delete(client);
      }
    }
  }, 30000);

  console.log("[WS] WebSocket server ready at /ws");
}

function broadcast(type, data) {
  if (!wss) return;
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

module.exports = { setupWebSocket, broadcast };