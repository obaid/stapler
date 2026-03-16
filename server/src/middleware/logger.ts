import pino from "pino";
import { pinoHttp } from "pino-http";

export const logger = pino({
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      translateTime: "HH:MM:ss",
      ignore: "pid,hostname",
      singleLine: true,
      colorize: true,
    },
  },
});

export const httpLogger = pinoHttp({
  logger,
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage(req, res, err) {
    return `${req.method} ${req.url} ${res.statusCode} — ${err?.message || "unknown error"}`;
  },
});
