export interface AdapterAgent {
  id: string;
  companyId: string;
  name: string;
  adapterType: string;
  adapterConfig: unknown;
}

export interface AdapterRuntime {
  sessionId: string | null;
  sessionParams: Record<string, unknown>;
  sessionDisplayId: string | null;
  taskKey: string | null;
}

export interface AdapterExecutionResult {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  errorMessage: string | null;
  errorCode: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
  };
  sessionId?: string | null;
  sessionParams?: Record<string, unknown>;
  sessionDisplayId?: string | null;
  provider?: string;
  model?: string;
  costUsd?: number;
  resultJson?: Record<string, unknown>;
  summary?: string;
}

export interface AdapterExecutionContext {
  runId: string;
  agent: AdapterAgent;
  runtime: AdapterRuntime;
  config: Record<string, unknown>;
  context: Record<string, unknown>;
  onLog(stream: "stdout" | "stderr", chunk: string): Promise<void>;
  onMeta?(meta: Record<string, unknown>): Promise<void>;
  authToken?: string;
}
