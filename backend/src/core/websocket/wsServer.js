const WebSocket = require('ws');
const logger = require('../logger/logger');

class WebSocketServerManager {
  constructor() {
    this.wss = null;
    this.userSockets = new Map();
  }

  init(server) {
    this.wss = new WebSocket.Server({ noServer: true });
    this.setupHeartbeat();
    return this.wss;
  }

  setupHeartbeat() {
    setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000).unref();
  }

  registerConnection(ws, userId) {
    ws.userId = userId;
    ws.isAlive = true;
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(ws);

    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('close', () => {
      const userConns = this.userSockets.get(userId);
      if (userConns) {
        userConns.delete(ws);
        if (userConns.size === 0) this.userSockets.delete(userId);
      }
    });
  }

  sendToUser(userId, payload) {
    const conns = this.userSockets.get(userId);
    if (!conns) return;
    const data = JSON.stringify(payload);
    conns.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });
  }

  broadcast(payload) {
    if (!this.wss) return;
    const data = JSON.stringify(payload);
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });
  }
}

module.exports = new WebSocketServerManager();
