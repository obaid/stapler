import { heartbeat } from "./stapler-client.js";

const HEARTBEAT_INTERVAL = 60_000; // 60 seconds
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startHeartbeat(getStatus?: () => string) {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    try {
      const status = getStatus?.() || "idle";
      await heartbeat(status);
    } catch (err) {
      console.error("[stapler] Heartbeat failed:", err);
    }
  }, HEARTBEAT_INTERVAL);

  // Send initial heartbeat
  void heartbeat("idle").catch(() => {});
}

export function stopHeartbeat() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
