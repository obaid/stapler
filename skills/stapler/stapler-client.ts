const STAPLER_URL = process.env.STAPLER_URL || "http://localhost:3100";
const STAPLER_API_KEY = process.env.STAPLER_API_KEY || "";

async function request(method: string, path: string, body?: unknown) {
  const url = `${STAPLER_URL}/api${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${STAPLER_API_KEY}`,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stapler API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function poll() {
  return request("GET", "/agent/poll");
}

export async function heartbeat(status?: string) {
  return request("POST", "/agent/heartbeat", { status });
}

export async function checkoutTask(taskId: string) {
  return request("POST", `/agent/tasks/${taskId}/checkout`);
}

export async function reportProgress(taskId: string, progress: number, message?: string) {
  return request("POST", `/agent/tasks/${taskId}/progress`, { progress, message });
}

export async function completeTask(taskId: string, summary?: string) {
  return request("POST", `/agent/tasks/${taskId}/complete`, { summary });
}

export async function failTask(taskId: string, error: string) {
  return request("POST", `/agent/tasks/${taskId}/fail`, { error });
}

export async function addComment(taskId: string, body: string) {
  return request("POST", `/agent/tasks/${taskId}/comment`, { body });
}

export async function register(companyId: string, agentName: string, opts?: {
  openclawGatewayUrl?: string;
  capabilities?: string;
  webhookUrl?: string;
}) {
  const staplerUrl = STAPLER_URL;
  const res = await fetch(`${staplerUrl}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId, agentName, ...opts }),
  });
  if (!res.ok) throw new Error(`Registration failed: ${await res.text()}`);
  return res.json();
}

export async function checkRegistrationStatus(registrationId: string) {
  const staplerUrl = STAPLER_URL;
  const res = await fetch(`${staplerUrl}/api/register/${registrationId}/status`);
  if (!res.ok) throw new Error(`Status check failed: ${await res.text()}`);
  return res.json();
}

export async function claimRegistration(registrationId: string, claimSecret: string) {
  const staplerUrl = STAPLER_URL;
  const res = await fetch(`${staplerUrl}/api/register/${registrationId}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claimSecret }),
  });
  if (!res.ok) throw new Error(`Claim failed: ${await res.text()}`);
  return res.json();
}
