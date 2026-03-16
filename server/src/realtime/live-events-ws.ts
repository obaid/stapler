import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import { createRequire } from "node:module";
import { subscribeCompanyLiveEvents } from "../services/live-events.js";
import { logger } from "../middleware/logger.js";
import type { DeploymentMode } from "@stapler/shared";

interface WsSocket {
  readyState: number;
  ping(): void;
  send(data: string): void;
  terminate(): void;
  close(code?: number, reason?: string): void;
  on(event: "pong", listener: () => void): void;
  on(event: "close", listener: () => void): void;
  on(event: "error", listener: (err: Error) => void): void;
}

interface WsServer {
  clients: Set<WsSocket>;
  on(event: "connection", listener: (socket: WsSocket, req: IncomingMessage) => void): void;
  on(event: "close", listener: () => void): void;
  handleUpgrade(
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
    callback: (ws: WsSocket) => void,
  ): void;
  emit(event: "connection", ws: WsSocket, req: IncomingMessage): boolean;
}

const require = createRequire(import.meta.url);
const { WebSocket, WebSocketServer } = require("ws") as {
  WebSocket: { OPEN: number };
  WebSocketServer: new (opts: { noServer: boolean }) => WsServer;
};

function parseCompanyId(pathname: string) {
  const match = pathname.match(/^\/api\/companies\/([^/]+)\/events\/ws$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1] ?? "");
  } catch {
    return null;
  }
}

function rejectUpgrade(socket: Duplex, statusLine: string, message: string) {
  socket.write(`HTTP/1.1 ${statusLine}\r\nConnection: close\r\nContent-Type: text/plain\r\n\r\n${message}`);
  socket.destroy();
}

export function setupLiveEventsWebSocketServer(
  server: HttpServer,
  opts: { deploymentMode: DeploymentMode },
) {
  const wss = new WebSocketServer({ noServer: true });
  const cleanupByClient = new Map<WsSocket, () => void>();
  const aliveByClient = new Map<WsSocket, boolean>();

  const pingInterval = setInterval(() => {
    for (const socket of wss.clients) {
      if (!aliveByClient.get(socket)) {
        socket.terminate();
        continue;
      }
      aliveByClient.set(socket, false);
      socket.ping();
    }
  }, 30000);

  wss.on("connection", (socket: WsSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", "http://localhost");
    const companyId = parseCompanyId(url.pathname);
    if (!companyId) {
      socket.close(1008, "missing company id");
      return;
    }

    const unsubscribe = subscribeCompanyLiveEvents(companyId, (event) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify(event));
    });

    cleanupByClient.set(socket, unsubscribe);
    aliveByClient.set(socket, true);

    socket.on("pong", () => aliveByClient.set(socket, true));
    socket.on("close", () => {
      cleanupByClient.get(socket)?.();
      cleanupByClient.delete(socket);
      aliveByClient.delete(socket);
    });
    socket.on("error", (err: Error) => {
      logger.warn({ err }, "WebSocket client error");
    });
  });

  wss.on("close", () => clearInterval(pingInterval));

  server.on("upgrade", (req, socket, head) => {
    if (!req.url) {
      rejectUpgrade(socket, "400 Bad Request", "missing url");
      return;
    }

    const url = new URL(req.url, "http://localhost");
    const companyId = parseCompanyId(url.pathname);
    if (!companyId) {
      socket.destroy();
      return;
    }

    // In local_trusted mode, allow all connections
    if (opts.deploymentMode === "local_trusted") {
      wss.handleUpgrade(req, socket, head, (ws: WsSocket) => {
        wss.emit("connection", ws, req);
      });
      return;
    }

    // For authenticated mode, reject without proper auth
    rejectUpgrade(socket, "403 Forbidden", "forbidden");
  });

  return wss;
}
