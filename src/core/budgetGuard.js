import { AppError } from "./errors.js";

export class BudgetGuard {
  constructor({ audit }) {
    this.audit = audit;
    this.usageByTask = new Map();
  }

  ensureTask(taskId) {
    if (!this.usageByTask.has(taskId)) {
      this.usageByTask.set(taskId, {
        task_id: taskId,
        tool_calls: 0,
        estimated_usd: 0
      });
    }
    return this.usageByTask.get(taskId);
  }

  beforeToolCall({ taskId, budget, toolName }) {
    const usage = this.ensureTask(taskId);
    const maxToolCalls = Number(budget?.max_tool_calls ?? Number.POSITIVE_INFINITY);
    if (usage.tool_calls + 1 > maxToolCalls) {
      this.audit?.record("budget.exceeded", {
        task_id: taskId,
        dimension: "tool_calls",
        tool_name: toolName,
        current: usage.tool_calls,
        limit: maxToolCalls
      });
      throw new AppError("Task exceeded max tool calls budget", {
        code: "budget_exceeded",
        status: 429,
        details: { task_id: taskId, dimension: "tool_calls", limit: maxToolCalls }
      });
    }
    usage.tool_calls += 1;
    this.audit?.record("budget.tool_call", {
      task_id: taskId,
      tool_name: toolName,
      tool_calls: usage.tool_calls,
      max_tool_calls: maxToolCalls
    });
    return usage;
  }

  recordCost({ taskId, budget, cost }) {
    const usage = this.ensureTask(taskId);
    usage.estimated_usd = Number((usage.estimated_usd + Number(cost?.estimated_usd || 0)).toFixed(6));
    const maxUsd = Number(budget?.max_usd ?? Number.POSITIVE_INFINITY);
    this.audit?.record("budget.cost", {
      task_id: taskId,
      estimated_usd: usage.estimated_usd,
      max_usd: maxUsd
    });
    if (usage.estimated_usd > maxUsd) {
      this.audit?.record("budget.exceeded", {
        task_id: taskId,
        dimension: "estimated_usd",
        current: usage.estimated_usd,
        limit: maxUsd
      });
      throw new AppError("Task exceeded max cost budget", {
        code: "budget_exceeded",
        status: 429,
        details: { task_id: taskId, dimension: "estimated_usd", limit: maxUsd }
      });
    }
    return usage;
  }

  getUsage(taskId) {
    return this.ensureTask(taskId);
  }

  snapshot() {
    return [...this.usageByTask.values()];
  }

  load(usages = []) {
    this.usageByTask = new Map();
    for (const usage of usages) {
      this.usageByTask.set(usage.task_id, usage);
    }
  }
}
