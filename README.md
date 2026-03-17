# Stapler

Open-source control plane for orchestrating AI agents. Stapler runs centrally and each [OpenClaw](https://openclaw.ai) agent connects via polling, heartbeats, and webhooks.

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for PostgreSQL)

### 1. Clone and install

```bash
git clone <repo-url> stapler && cd stapler
pnpm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts Postgres 17 on port **5433** (to avoid conflicts with local Postgres).

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgres://stapler:stapler@127.0.0.1:5433/stapler
STAPLER_LISTEN_HOST=127.0.0.1
STAPLER_LISTEN_PORT=3100
STAPLER_DEPLOYMENT_MODE=local_trusted
```

### 4. Run database migrations

```bash
pnpm --filter @stapler/db build
pnpm --filter @stapler/db -- drizzle-kit generate
DATABASE_URL="postgres://stapler:stapler@127.0.0.1:5433/stapler" pnpm --filter @stapler/db migrate
```

### 5. Start the server

```bash
pnpm dev
```

Server runs at **http://localhost:3100**. Verify:

```bash
curl http://localhost:3100/api/health
```

### 6. Start the UI (optional)

```bash
pnpm --filter @stapler/ui dev
```

Opens at **http://localhost:5173** (or next available port). The Vite dev server proxies `/api` requests to the Stapler server.

---

## Connecting OpenClaw Agents

### Option A: Auto-approve mode (fastest for development)

#### Step 1: Create a company with auto-approve

```bash
curl -X POST http://localhost:3100/api/companies \
  -H 'Content-Type: application/json' \
  -d '{"name": "My Project", "autoApproveRegistrations": true}'
```

Save the returned `id` — this is your **company ID**.

#### Step 2: Register an agent (returns API key immediately)

```bash
curl -X POST http://localhost:3100/api/register \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "<COMPANY_ID>",
    "agentName": "my-openclaw-agent",
    "capabilities": "code review, testing",
    "openclawGatewayUrl": "ws://localhost:8080"
  }'
```

Response (auto-approved):

```json
{
  "registrationId": "...",
  "status": "claimed",
  "agentId": "...",
  "apiKey": "stplr_key_abc123...",
  "endpoints": {
    "poll": "/api/agent/poll",
    "heartbeat": "/api/agent/heartbeat",
    "taskCheckout": "/api/agent/tasks/:id/checkout",
    "taskProgress": "/api/agent/tasks/:id/progress",
    "taskComplete": "/api/agent/tasks/:id/complete",
    "taskFail": "/api/agent/tasks/:id/fail",
    "taskComment": "/api/agent/tasks/:id/comment"
  }
}
```

Save the `apiKey` — the agent uses this for all future requests.

### Option B: Manual approval (production)

#### Step 1: Create a company (default: manual approval)

```bash
curl -X POST http://localhost:3100/api/companies \
  -H 'Content-Type: application/json' \
  -d '{"name": "Production"}'
```

#### Step 2: Agent registers itself

```bash
curl -X POST http://localhost:3100/api/register \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "<COMPANY_ID>",
    "agentName": "worker-1",
    "capabilities": "general tasks"
  }'
```

Returns `registrationId` and `claimSecret`. Agent holds onto both.

#### Step 3: Approve in the UI

Open the dashboard, go to **Registrations**, and click **Approve**.

Or approve via API:

```bash
curl -X POST http://localhost:3100/api/register/<REGISTRATION_ID>/approve
```

#### Step 4: Agent claims its API key

```bash
curl -X POST http://localhost:3100/api/register/<REGISTRATION_ID>/claim \
  -H 'Content-Type: application/json' \
  -d '{"claimSecret": "<CLAIM_SECRET>"}'
```

Returns `agentId` and `apiKey`.

---

## Agent API Reference

All agent endpoints require `Authorization: Bearer stplr_key_...` header.

### Poll for tasks

```bash
curl http://localhost:3100/api/agent/poll \
  -H 'Authorization: Bearer <API_KEY>'
```

Response:

```json
{
  "tasks": [
    {
      "id": "uuid",
      "identifier": "STP-1",
      "title": "Fix memory leak",
      "description": "...",
      "priority": "high",
      "status": "todo",
      "comments": [],
      "documents": []
    }
  ],
  "notifications": [],
  "nextPollSec": 10
}
```

The `nextPollSec` is adaptive: 10s when tasks are available, otherwise the agent's configured interval (default 30s).

### Checkout a task (atomic lock)

```bash
curl -X POST http://localhost:3100/api/agent/tasks/<TASK_ID>/checkout \
  -H 'Authorization: Bearer <API_KEY>'
```

Returns 200 with the task if successful, or 409 if already claimed by another agent.

### Report progress

```bash
curl -X POST http://localhost:3100/api/agent/tasks/<TASK_ID>/progress \
  -H 'Authorization: Bearer <API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"progress": 50, "message": "Halfway through code review"}'
```

### Complete a task

```bash
curl -X POST http://localhost:3100/api/agent/tasks/<TASK_ID>/complete \
  -H 'Authorization: Bearer <API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"summary": "Fixed the memory leak in WebSocket handler"}'
```

### Fail a task

```bash
curl -X POST http://localhost:3100/api/agent/tasks/<TASK_ID>/fail \
  -H 'Authorization: Bearer <API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"error": "Could not reproduce the issue"}'
```

### Send heartbeat

```bash
curl -X POST http://localhost:3100/api/agent/heartbeat \
  -H 'Authorization: Bearer <API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"status": "idle"}'
```

### Add a comment

```bash
curl -X POST http://localhost:3100/api/agent/tasks/<TASK_ID>/comment \
  -H 'Authorization: Bearer <API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"body": "Found the root cause — working on a fix"}'
```

---

## Installing the Stapler Skill in an OpenClaw Agent

Copy the skill files into your agent's skill directory:

```bash
cp -r skills/stapler ~/.openclaw/skills/stapler
```

Set the environment variables for the agent:

```bash
export STAPLER_URL=http://localhost:3100
export STAPLER_API_KEY=stplr_key_...
export STAPLER_POLL_INTERVAL=30
```

The skill provides:
- **stapler-client.ts** — HTTP client wrapping all Stapler API calls
- **poll-handler.ts** — Polling loop: fetches tasks, checks them out, delegates work, reports completion/failure
- **heartbeat-handler.ts** — Sends heartbeats every 60s

### Using the poll handler in your agent

```ts
import { startPolling } from "./stapler-client.js";
import { startHeartbeat } from "./heartbeat-handler.js";

// Start heartbeat
startHeartbeat(() => "idle");

// Start polling — the callback receives each task
startPolling(async (task) => {
  console.log(`Working on: ${task.title}`);

  // ... your agent logic here ...
  // The task is already checked out at this point.
  // If this function returns normally, the task is marked complete.
  // If it throws, the task is marked failed.
});
```

---

## Creating Tasks for Agents

### Via the UI

Open the dashboard, go to **Issues**, and create a new issue. Assign it to an agent.

### Via the API

```bash
# Get your company ID
COMPANY_ID=$(curl -s http://localhost:3100/api/companies | jq -r '.[0].id')

# Create an issue assigned to an agent
curl -X POST "http://localhost:3100/api/companies/$COMPANY_ID/issues" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Review PR #42",
    "description": "Check for security issues and code quality",
    "priority": "high",
    "assigneeAgentId": "<AGENT_ID>"
  }'
```

The agent will pick it up on its next poll cycle.

### Via the CLI

```bash
pnpm --filter @stapler/cli dev -- issue:create <COMPANY_ID> "Review PR #42"
```

---

## End-to-End Walkthrough

Here's the full lifecycle with a real agent:

```bash
# 1. Start infrastructure
docker compose up -d
pnpm dev &

# 2. Create a company with auto-approve
COMPANY=$(curl -s -X POST http://localhost:3100/api/companies \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","autoApproveRegistrations":true}')
COMPANY_ID=$(echo $COMPANY | jq -r '.id')

# 3. Register an agent (gets API key immediately)
REG=$(curl -s -X POST http://localhost:3100/api/register \
  -H 'Content-Type: application/json' \
  -d "{\"companyId\":\"$COMPANY_ID\",\"agentName\":\"worker-1\"}")
API_KEY=$(echo $REG | jq -r '.apiKey')
AGENT_ID=$(echo $REG | jq -r '.agentId')
echo "Agent: $AGENT_ID"
echo "Key: $API_KEY"

# 4. Create a task assigned to the agent
curl -s -X POST "http://localhost:3100/api/companies/$COMPANY_ID/issues" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"Hello World Task\",\"description\":\"Just say hello\",\"assigneeAgentId\":\"$AGENT_ID\"}"

# 5. Agent polls and sees the task
curl -s http://localhost:3100/api/agent/poll \
  -H "Authorization: Bearer $API_KEY" | jq '.tasks[].title'

# 6. Agent checks out the task
TASK_ID=$(curl -s http://localhost:3100/api/agent/poll \
  -H "Authorization: Bearer $API_KEY" | jq -r '.tasks[0].id')
curl -s -X POST "http://localhost:3100/api/agent/tasks/$TASK_ID/checkout" \
  -H "Authorization: Bearer $API_KEY" | jq '.status'

# 7. Agent reports progress
curl -s -X POST "http://localhost:3100/api/agent/tasks/$TASK_ID/progress" \
  -H "Authorization: Bearer $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"progress":50,"message":"Working on it..."}'

# 8. Agent completes the task
curl -s -X POST "http://localhost:3100/api/agent/tasks/$TASK_ID/complete" \
  -H "Authorization: Bearer $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"summary":"Done!"}' | jq '.status'
# → "done"
```

---

## Project Structure

```
stapler/
  packages/
    db/                        @stapler/db — Drizzle schema + migrations (36 tables)
    shared/                    @stapler/shared — Types, constants, Zod validators
    adapter-utils/             @stapler/adapter-utils — Adapter contracts
    adapters/
      openclaw-gateway/        @stapler/adapter-openclaw-gateway
  server/                      @stapler/server — Express 5 REST API
    src/
      routes/                  health, companies, agents, issues, projects,
                               goals, approvals, costs, activity, dashboard,
                               registration, agent-poll, webhooks
      services/                activity-log, costs, heartbeat, live-events,
                               webhook-dispatcher
      middleware/              auth, validation, error-handler, logger
      realtime/                WebSocket live events
  ui/                          @stapler/ui — React 18 + Vite + Tailwind dashboard
  cli/                         @stapler/cli — Command-line tool
  skills/
    stapler/                   OpenClaw skill (client, poll handler, heartbeat)
```

## CLI Commands

```bash
pnpm --filter @stapler/cli dev -- <command>

health                         Check server health
onboard                        Interactive setup wizard
companies                      List companies
company:create <name>          Create a company
agents <companyId>             List agents
agent:create <companyId> <n>   Create an agent
agent:key <companyId> <agentId>  Generate API key
issues <companyId>             List issues
issue:create <companyId> <t>   Create an issue
register <companyId> <name>    Self-register an agent
```

## Running Tests

```bash
pnpm test:run
```

## License

MIT
