import { STREAMS } from "../bus/inMemoryStreamBus.js";
import { defaultBudgetFor, MODEL_POLICY } from "../core/costs.js";
import { AppError } from "../core/errors.js";
import { nowIso, uuid } from "../core/ids.js";
import { normalizeTaskRequest } from "../core/validation.js";
import { redactStructured } from "../security/policies.js";

function classifyDomain(prompt, hint) {
  if (hint === "sre" || /incident|5xx|datadog|circleci|pipeline|build|deploy|sre/i.test(prompt)) return "sre";
  if (hint === "customer_success" || /cliente|customer|cuenta|account|jira|ticket|respuesta|cs/i.test(prompt)) {
    return "customer_success";
  }
  return "general";
}

function classifyRisk(prompt, domain) {
  if (/rollback|produccion|production|delete|permission|secret/i.test(prompt)) return "critical";
  if (/incident|5xx|cliente|customer|outage/i.test(prompt)) return "high";
  if (domain === "general") return "low";
  return "medium";
}

function taskTypeFor(prompt, domain) {
  if (domain === "sre" && /pipeline|circleci|build/i.test(prompt)) return "pipeline_analysis";
  if (domain === "sre") return "incident_triage";
  if (domain === "customer_success" && /respuesta|response/i.test(prompt)) return "customer_response_draft";
  if (domain === "customer_success") return "account_summary";
  return "general_assistance";
}

function streamFor(domain) {
  if (domain === "sre") return STREAMS.SRE;
  if (domain === "customer_success") return STREAMS.CS;
  return STREAMS.DISPATCH;
}

export class Dispatcher {
  constructor({ bus, audit, budgetGuard }) {
    this.bus = bus;
    this.audit = audit;
    this.budgetGuard = budgetGuard;
    this.tasks = new Map();
  }

  createTask(rawBody) {
    const request = normalizeTaskRequest(rawBody);
    const domain = classifyDomain(request.prompt, request.domain_hint);
    if (domain === "general") {
      throw new AppError("No specialized worker matched this task", {
        code: "routing_failed",
        details: { supported_domains: ["sre", "customer_success"] }
      });
    }

    const riskLevel = classifyRisk(request.prompt, domain);
    const taskType = taskTypeFor(request.prompt, domain);
    const taskId = uuid();
    const traceId = uuid();
    const modelPolicy = riskLevel === "critical" ? MODEL_POLICY.OPUS : "sonnet-first-opus-escalation";
    const budget = {
      ...defaultBudgetFor(domain, riskLevel),
      ...(request.metadata.budget || {})
    };
    const event = {
      event_id: uuid(),
      task_id: taskId,
      created_at: nowIso(),
      source: request.source,
      requested_by: request.requested_by,
      domain,
      task_type: taskType,
      risk_level: riskLevel,
      urgency: request.urgency,
      worker: domain === "sre" ? "sre-worker" : "cs-worker",
      model_policy: modelPolicy,
      payload: {
        prompt: request.prompt,
        metadata: request.metadata
      },
      context_refs: [],
      budget,
      approval_required: riskLevel === "critical",
      trace_id: traceId
    };

    const task = {
      task_id: taskId,
      status: "queued",
      stream: streamFor(domain),
      event,
      result: null,
      error: null,
      created_at: event.created_at,
      updated_at: event.created_at
    };

    this.tasks.set(taskId, task);

    this.audit?.record("dispatcher.route", {
      task_id: taskId,
      domain,
      task_type: taskType,
      risk_level: riskLevel,
      worker: event.worker,
      model_policy: modelPolicy
    });

    this.bus.publish(streamFor(domain), event);
    return this.tasks.get(taskId);
  }

  attachResultListener() {
    this.bus.subscribe(STREAMS.RESULT, "dispatcher-result-listener", async (event) => {
      const task = this.tasks.get(event.task_id);
      if (!task) return;
      try {
        this.budgetGuard?.recordCost({
          taskId: event.task_id,
          budget: task.event.budget,
          cost: event.result?.cost
        });
      } catch (error) {
        task.status = "failed";
        task.result = event.result;
        task.error = {
          reason: error.message,
          code: error.code || "budget_exceeded",
          details: error.details || {}
        };
        task.updated_at = nowIso();
        this.bus.publish(STREAMS.DLQ, {
          task_id: event.task_id,
          failed_stream: STREAMS.RESULT,
          failed_consumer: "dispatcher-result-listener",
          reason: error.message,
          code: error.code || "budget_exceeded",
          details: error.details || {},
          original_event: event
        });
        return;
      }
      const sanitized = redactStructured(event.result || {});
      if (sanitized.redacted) {
        this.audit?.record("security.output_redacted", {
          task_id: event.task_id,
          field: "result"
        });
      }
      task.status = "completed";
      task.result = sanitized.value;
      task.error = null;
      task.updated_at = nowIso();
      this.audit?.record("dispatcher.complete", { task_id: event.task_id, worker: event.worker });
    });

    this.bus.subscribe(STREAMS.DLQ, "dispatcher-dlq-listener", async (event) => {
      const task = this.tasks.get(event.task_id);
      if (!task) return;
      task.status = "failed";
      task.error = {
        reason: event.reason,
        code: event.code,
        details: event.details,
        failed_stream: event.failed_stream,
        failed_consumer: event.failed_consumer
      };
      task.updated_at = nowIso();
      this.audit?.record("dispatcher.failed", {
        task_id: event.task_id,
        reason: event.reason,
        failed_stream: event.failed_stream
      });
    });
  }

  getTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) throw new AppError("Task not found", { code: "not_found", status: 404 });
    return task;
  }

  listTasks() {
    return [...this.tasks.values()];
  }

  snapshot() {
    return {
      tasks: this.listTasks()
    };
  }

  load(snapshot = {}) {
    this.tasks = new Map();
    for (const task of snapshot.tasks || []) {
      this.tasks.set(task.task_id, task);
    }
  }

  cancelTask(taskId, reason) {
    const task = this.getTask(taskId);
    if (task.status === "completed") {
      throw new AppError("Cannot cancel a completed task", { code: "invalid_state" });
    }
    this.bus.cancelTask(taskId, reason);
    task.status = "cancelled";
    task.updated_at = nowIso();
    this.audit?.record("dispatcher.cancel", { task_id: taskId, reason });
    return task;
  }
}
