import { Router } from "express";
import type { DeploymentMode } from "@stapler/shared";

export function healthRoutes(opts: { deploymentMode: DeploymentMode }) {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      status: "ok",
      version: "0.1.0",
      deploymentMode: opts.deploymentMode,
    });
  });

  return router;
}
