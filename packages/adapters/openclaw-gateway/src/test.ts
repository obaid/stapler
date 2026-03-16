import WebSocket from "ws";

export interface ConnectionTestResult {
  ok: boolean;
  url: string;
  checks: Array<{ label: string; passed: boolean; message?: string }>;
}

export async function testConnection(config: unknown): Promise<ConnectionTestResult> {
  const raw = (config && typeof config === "object" ? config : {}) as Record<string, unknown>;
  const url = String(raw.url || "");
  const checks: ConnectionTestResult["checks"] = [];

  if (!url) {
    checks.push({ label: "URL configured", passed: false, message: "No gateway URL" });
    return { ok: false, url, checks };
  }

  checks.push({ label: "URL configured", passed: true });

  try {
    const parsed = new URL(url);
    const validProtocol = parsed.protocol === "ws:" || parsed.protocol === "wss:";
    checks.push({
      label: "Valid WebSocket URL",
      passed: validProtocol,
      message: validProtocol ? undefined : `Expected ws:// or wss://, got ${parsed.protocol}`,
    });

    if (!validProtocol) {
      return { ok: false, url, checks };
    }
  } catch {
    checks.push({ label: "Valid WebSocket URL", passed: false, message: "Failed to parse URL" });
    return { ok: false, url, checks };
  }

  // Probe connectivity
  const connected = await new Promise<boolean>((resolve) => {
    const ws = new WebSocket(url, {
      headers: raw.authToken ? { Authorization: `Bearer ${String(raw.authToken)}` } : {},
    });

    const timer = setTimeout(() => {
      ws.close();
      resolve(false);
    }, 5000);

    ws.on("open", () => {
      clearTimeout(timer);
      ws.close();
      resolve(true);
    });

    ws.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });

  checks.push({
    label: "Gateway reachable",
    passed: connected,
    message: connected ? undefined : "Could not connect within 5s",
  });

  return { ok: checks.every((c) => c.passed), url, checks };
}
