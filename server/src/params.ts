import type { Request } from "express";
import { badRequest } from "./errors.js";

/** Safely extract a route parameter as a string (Express 5 types params as string | string[]). */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  throw badRequest(`Missing route parameter: ${name}`);
}
