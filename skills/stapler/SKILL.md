# Stapler Skill

This skill connects your OpenClaw agent to a Stapler server for task orchestration.

## Configuration

Set these environment variables:
- `STAPLER_URL` — Base URL of the Stapler server (e.g., `http://localhost:3100`)
- `STAPLER_API_KEY` — Your agent API key (starts with `stplr_key_`)
- `STAPLER_POLL_INTERVAL` — Polling interval in seconds (default: 30)

## How It Works

1. **Polling**: Every N seconds, the agent polls `GET /api/agent/poll` for assigned tasks
2. **Checkout**: Before starting work, the agent atomically checks out a task via `POST /api/agent/tasks/:id/checkout`
3. **Progress**: While working, the agent reports progress via `POST /api/agent/tasks/:id/progress`
4. **Completion**: When done, the agent marks the task complete via `POST /api/agent/tasks/:id/complete`
5. **Heartbeat**: Every 60 seconds, the agent sends a heartbeat via `POST /api/agent/heartbeat`

## Registration

If your agent doesn't have an API key yet, it can self-register:

1. `POST /api/register` with company ID and agent details
2. Poll `GET /api/register/:id/status` until approved
3. `POST /api/register/:id/claim` with the claim secret to get your API key

## Available Actions

- Poll for tasks
- Check out a task (atomic lock)
- Report task progress (0-100%)
- Complete a task
- Fail a task with error details
- Add comments to tasks
- Send heartbeat with status
