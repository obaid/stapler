#!/usr/bin/env node

const STAPLER_URL = process.env.STAPLER_URL || "http://localhost:3100";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "health":
      await checkHealth();
      break;
    case "companies":
      await listCompanies();
      break;
    case "company:create":
      await createCompany(args[1] || "Default");
      break;
    case "agents":
      await listAgents(args[1]);
      break;
    case "agent:create":
      await createAgent(args[1], args[2] || "New Agent");
      break;
    case "agent:key":
      await createAgentKey(args[1], args[2]);
      break;
    case "issues":
      await listIssues(args[1]);
      break;
    case "issue:create":
      await createIssue(args[1], args[2] || "New Issue");
      break;
    case "register":
      await registerAgent(args[1], args[2] || "CLI Agent");
      break;
    case "onboard":
      await onboard();
      break;
    default:
      printHelp();
  }
}

function printHelp() {
  console.log(`
Stapler CLI - AI Agent Orchestration

Usage: stapler <command> [args]

Commands:
  health                       Check server health
  onboard                      Interactive onboarding wizard
  companies                    List companies
  company:create <name>        Create a company
  agents <companyId>           List agents
  agent:create <companyId> <name>  Create an agent
  agent:key <companyId> <agentId>  Create an API key
  issues <companyId>           List issues
  issue:create <companyId> <title> Create an issue
  register <companyId> <name>  Register a new agent

Environment:
  STAPLER_URL  Server URL (default: http://localhost:3100)
`);
}

async function request(method: string, path: string, body?: unknown) {
  const res = await fetch(`${STAPLER_URL}/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Error ${res.status}: ${text}`);
    process.exit(1);
  }
  return res.json();
}

async function checkHealth() {
  const data = await request("GET", "/health");
  console.log("Server status:", data.status);
  console.log("Deployment:", data.deploymentMode);
  console.log("Version:", data.version);
}

async function listCompanies() {
  const data = await request("GET", "/companies");
  if (data.length === 0) {
    console.log("No companies found. Create one with: stapler company:create <name>");
    return;
  }
  console.log("Companies:");
  for (const c of data) {
    console.log(`  ${c.name} (${c.id})`);
  }
}

async function createCompany(name: string) {
  const data = await request("POST", "/companies", { name });
  console.log(`Created company: ${data.name} (${data.id})`);
}

async function listAgents(companyId?: string) {
  if (!companyId) {
    console.error("Usage: stapler agents <companyId>");
    process.exit(1);
  }
  const data = await request("GET", `/companies/${companyId}/agents`);
  if (data.length === 0) {
    console.log("No agents found.");
    return;
  }
  console.log("Agents:");
  for (const a of data) {
    console.log(`  ${a.name} [${a.status}] (${a.id})`);
  }
}

async function createAgent(companyId: string | undefined, name: string) {
  if (!companyId) {
    console.error("Usage: stapler agent:create <companyId> <name>");
    process.exit(1);
  }
  const data = await request("POST", `/companies/${companyId}/agents`, { name });
  console.log(`Created agent: ${data.name} (${data.id})`);
}

async function createAgentKey(companyId: string | undefined, agentId: string | undefined) {
  if (!companyId || !agentId) {
    console.error("Usage: stapler agent:key <companyId> <agentId>");
    process.exit(1);
  }
  const data = await request("POST", `/companies/${companyId}/agents/${agentId}/keys`, {
    name: "cli-generated",
  });
  console.log("API Key created (save this — it won't be shown again):");
  console.log(`  ${data.key}`);
}

async function listIssues(companyId?: string) {
  if (!companyId) {
    console.error("Usage: stapler issues <companyId>");
    process.exit(1);
  }
  const data = await request("GET", `/companies/${companyId}/issues`);
  if (data.length === 0) {
    console.log("No issues found.");
    return;
  }
  console.log("Issues:");
  for (const i of data) {
    console.log(`  ${i.identifier || "???"} ${i.title} [${i.status}]`);
  }
}

async function createIssue(companyId: string | undefined, title: string) {
  if (!companyId) {
    console.error("Usage: stapler issue:create <companyId> <title>");
    process.exit(1);
  }
  const data = await request("POST", `/companies/${companyId}/issues`, { title });
  console.log(`Created issue: ${data.identifier} - ${data.title}`);
}

async function registerAgent(companyId: string | undefined, agentName: string) {
  if (!companyId) {
    console.error("Usage: stapler register <companyId> <name>");
    process.exit(1);
  }
  const data = await request("POST", "/register", { companyId, agentName });

  if (data.status === "claimed") {
    console.log("Auto-approved! Agent registered immediately.");
    console.log(`Agent ID: ${data.agentId}`);
    console.log(`API Key: ${data.apiKey}`);
  } else {
    console.log(`Registration submitted (status: ${data.status})`);
    console.log(`Registration ID: ${data.registrationId}`);
    if (data.claimSecret) {
      console.log(`Claim Secret: ${data.claimSecret}`);
      console.log("Wait for approval, then claim with the secret.");
    }
  }
}

async function onboard() {
  console.log("=== Stapler Onboarding ===\n");

  // Check health
  console.log("Checking server...");
  try {
    await checkHealth();
  } catch {
    console.error(`Cannot reach server at ${STAPLER_URL}`);
    console.error("Start the server with: pnpm dev");
    process.exit(1);
  }

  console.log("\nChecking for companies...");
  const companies = await request("GET", "/companies");

  let companyId: string;
  if (companies.length === 0) {
    console.log("No companies found. Creating default workspace...");
    const company = await request("POST", "/companies", {
      name: "My Workspace",
      autoApproveRegistrations: true,
    });
    companyId = company.id;
    console.log(`Created: ${company.name} (${company.id})`);
  } else {
    companyId = companies[0].id;
    console.log(`Using: ${companies[0].name} (${companyId})`);
  }

  console.log("\nChecking for agents...");
  const agents = await request("GET", `/companies/${companyId}/agents`);
  if (agents.length === 0) {
    console.log("No agents yet. Create one with:");
    console.log(`  stapler agent:create ${companyId} "My Agent"`);
  } else {
    console.log(`Found ${agents.length} agent(s)`);
  }

  console.log("\nOnboarding complete! Dashboard: http://localhost:5173");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
