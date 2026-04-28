import { AppError } from "../core/errors.js";

export const ACTION_LEVELS = {
  L0: "L0",
  L1: "L1",
  L2: "L2",
  L3: "L3",
  L4: "L4"
};

const ROLE_PERMISSIONS = {
  requester: new Set([ACTION_LEVELS.L0]),
  sre: new Set([ACTION_LEVELS.L0, ACTION_LEVELS.L1]),
  cs: new Set([ACTION_LEVELS.L0, ACTION_LEVELS.L1]),
  admin: new Set([ACTION_LEVELS.L0, ACTION_LEVELS.L1, ACTION_LEVELS.L2, ACTION_LEVELS.L3])
};

const SUSPICIOUS_PATTERNS = [
  /ignore (all )?(previous|prior|system) instructions/i,
  /reveal (your )?(system prompt|secrets|credentials|tokens)/i,
  /disregard .* policy/i,
  /act as .* developer/i,
  /exfiltrate/i
];

export function detectPromptInjection(text) {
  const value = String(text || "");
  const matches = SUSPICIOUS_PATTERNS.filter((pattern) => pattern.test(value)).map((pattern) => pattern.source);
  return {
    suspicious: matches.length > 0,
    matches
  };
}

export function redactSensitive(value) {
  return String(value || "")
    .replace(/(sk-[A-Za-z0-9_-]{12,})/g, "[REDACTED_API_KEY]")
    .replace(/(ghp_[A-Za-z0-9_]{12,})/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/(AKIA[0-9A-Z]{16})/g, "[REDACTED_AWS_ACCESS_KEY]")
    .replace(/(xox[baprs]-[A-Za-z0-9-]{12,})/g, "[REDACTED_SLACK_TOKEN]")
    .replace(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi, "[REDACTED_EMAIL]");
}

export function redactStructured(value) {
  const serialized = JSON.stringify(value);
  const redacted = redactSensitive(serialized);
  return {
    value: JSON.parse(redacted),
    redacted: serialized !== redacted
  };
}

export class PolicyEngine {
  constructor({ audit }) {
    this.audit = audit;
  }

  assertCanAccess(requestedBy, actionLevel, { taskId, toolName } = {}) {
    const roles = requestedBy?.roles || [];
    const allowed = roles.some((role) => ROLE_PERMISSIONS[role]?.has(actionLevel));
    this.audit?.record("policy.access_check", {
      task_id: taskId,
      tool_name: toolName,
      action_level: actionLevel,
      user_id: requestedBy?.id,
      allowed
    });

    if (!allowed) {
      throw new AppError("User does not have permission for this action", {
        code: "permission_denied",
        status: 403,
        details: { action_level: actionLevel, tool_name: toolName }
      });
    }
  }

  requiresApproval(actionLevel) {
    return actionLevel === ACTION_LEVELS.L2 || actionLevel === ACTION_LEVELS.L3 || actionLevel === ACTION_LEVELS.L4;
  }
}
