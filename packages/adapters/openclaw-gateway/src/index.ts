export const adapterMeta = {
  type: "openclaw_gateway" as const,
  label: "OpenClaw Gateway",
  description: "Execute tasks via OpenClaw agent gateway over WebSocket",
};

export { execute } from "./execute.js";
export { testConnection } from "./test.js";
