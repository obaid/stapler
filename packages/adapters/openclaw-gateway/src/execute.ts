import type { AdapterExecutionContext, AdapterExecutionResult } from "@stapler/adapter-utils";
import WebSocket from "ws";

interface GatewayConfig {
  url: string;
  authToken?: string;
  headers?: Record<string, string>;
  timeoutSec?: number;
}

function parseConfig(raw: unknown): GatewayConfig {
  const config = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    url: String(config.url || ""),
    authToken: config.authToken ? String(config.authToken) : undefined,
    headers: config.headers as Record<string, string> | undefined,
    timeoutSec: typeof config.timeoutSec === "number" ? config.timeoutSec : 300,
  };
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const config = parseConfig(ctx.agent.adapterConfig);

  if (!config.url) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: "OpenClaw gateway URL not configured",
      errorCode: "NO_GATEWAY_URL",
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  return new Promise<AdapterExecutionResult>((resolve) => {
    const timeoutMs = (config.timeoutSec ?? 300) * 1000;
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({
        exitCode: null,
        signal: null,
        timedOut: true,
        errorMessage: `Gateway timeout after ${config.timeoutSec}s`,
        errorCode: "TIMEOUT",
        usage: { inputTokens: 0, outputTokens: 0 },
      });
    }, timeoutMs);

    const wsHeaders: Record<string, string> = { ...config.headers };
    if (config.authToken) {
      wsHeaders["Authorization"] = `Bearer ${config.authToken}`;
    }

    const ws = new WebSocket(config.url, { headers: wsHeaders });

    ws.on("open", () => {
      const payload = {
        type: "execute",
        runId: ctx.runId,
        agent: {
          id: ctx.agent.id,
          name: ctx.agent.name,
        },
        context: ctx.context,
        config: ctx.config,
      };
      ws.send(JSON.stringify(payload));
    });

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "log") {
          await ctx.onLog(msg.stream || "stdout", msg.message || "");
          return;
        }

        if (msg.type === "meta" && ctx.onMeta) {
          await ctx.onMeta(msg.data || {});
          return;
        }

        if (msg.type === "result") {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          ws.close();

          resolve({
            exitCode: msg.exitCode ?? 0,
            signal: msg.signal ?? null,
            timedOut: false,
            errorMessage: msg.error ?? null,
            errorCode: msg.errorCode ?? null,
            usage: {
              inputTokens: msg.usage?.inputTokens ?? 0,
              outputTokens: msg.usage?.outputTokens ?? 0,
              cachedInputTokens: msg.usage?.cachedInputTokens,
            },
            provider: msg.provider,
            model: msg.model,
            costUsd: msg.costUsd,
            resultJson: msg.resultJson,
            summary: msg.summary,
          });
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      resolve({
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: `WebSocket error: ${err.message}`,
        errorCode: "WS_ERROR",
        usage: { inputTokens: 0, outputTokens: 0 },
      });
    });

    ws.on("close", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      resolve({
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: "WebSocket closed before result",
        errorCode: "WS_CLOSED",
        usage: { inputTokens: 0, outputTokens: 0 },
      });
    });
  });
}
