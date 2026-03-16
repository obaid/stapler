import express, { Router } from "express";
import type { Db } from "@stapler/db";
import type { DeploymentMode } from "@stapler/shared";
import { httpLogger, errorHandler } from "./middleware/index.js";
import { actorMiddleware } from "./middleware/auth.js";
import { healthRoutes } from "./routes/health.js";
import { companyRoutes } from "./routes/companies.js";
import { agentRoutes } from "./routes/agents.js";
import { issueRoutes } from "./routes/issues.js";
import { projectRoutes } from "./routes/projects.js";
import { goalRoutes } from "./routes/goals.js";
import { approvalRoutes } from "./routes/approvals.js";
import { costRoutes } from "./routes/costs.js";
import { activityRoutes } from "./routes/activity.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { registrationRoutes } from "./routes/registration.js";
import { agentPollRoutes } from "./routes/agent-poll.js";

export function createApp(db: Db, opts: { deploymentMode: DeploymentMode }) {
  const app = express();

  app.use(express.json());
  app.use(httpLogger);
  app.use(actorMiddleware(db, { deploymentMode: opts.deploymentMode }));

  const api = Router();
  api.use("/health", healthRoutes({ deploymentMode: opts.deploymentMode }));
  api.use("/companies", companyRoutes(db));
  api.use(agentRoutes(db));
  api.use(issueRoutes(db));
  api.use(projectRoutes(db));
  api.use(goalRoutes(db));
  api.use(approvalRoutes(db));
  api.use(costRoutes(db));
  api.use(activityRoutes(db));
  api.use(dashboardRoutes(db));
  api.use(registrationRoutes(db));
  api.use(agentPollRoutes(db));

  app.use("/api", api);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  app.use(errorHandler);

  return app;
}
