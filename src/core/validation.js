import { AppError } from "./errors.js";

export const DOMAINS = new Set(["sre", "customer_success", "general"]);
export const RISK_LEVELS = new Set(["low", "medium", "high", "critical"]);
export const URGENCY_LEVELS = new Set(["low", "normal", "high", "urgent"]);

export function assertObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(`${name} must be an object`, {
      code: "validation_error",
      details: { field: name }
    });
  }
}

export function requireString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(`${name} must be a non-empty string`, {
      code: "validation_error",
      details: { field: name }
    });
  }
  return value.trim();
}

export function optionalEnum(value, allowed, fallback, name) {
  if (value === undefined || value === null || value === "") return fallback;
  if (!allowed.has(value)) {
    throw new AppError(`${name} must be one of: ${Array.from(allowed).join(", ")}`, {
      code: "validation_error",
      details: { field: name, value }
    });
  }
  return value;
}

export function normalizeTaskRequest(body) {
  assertObject(body, "body");
  const prompt = requireString(body.prompt, "prompt");
  const source = body.source || "api";
  const requestedBy = body.requested_by || {};

  return {
    prompt,
    source,
    requested_by: {
      type: requestedBy.type || "user",
      id: requireString(requestedBy.id || "local-user", "requested_by.id"),
      team: requestedBy.team || "default",
      roles: Array.isArray(requestedBy.roles) ? requestedBy.roles : ["requester"]
    },
    domain_hint: body.domain_hint,
    urgency: optionalEnum(body.urgency, URGENCY_LEVELS, "normal", "urgency"),
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {}
  };
}

