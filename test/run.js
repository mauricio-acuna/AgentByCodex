import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { buildMetrics } from "../src/observability/metrics.js";

function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("routes SRE incident tasks to the SRE worker and returns grounded output", async () => {
  const app = createApp();
  const task = app.dispatcher.createTask({
    prompt: "Investiga por que subieron los errores 5xx del servicio billing-api",
    requested_by: { id: "ana", team: "sre", roles: ["sre"] },
    domain_hint: "sre"
  });

  await nextTick();
  const completed = app.dispatcher.getTask(task.task_id);

  assert.equal(completed.status, "completed");
  assert.equal(completed.event.domain, "sre");
  assert.equal(completed.result.severity_estimate, "high");
  assert.ok(completed.result.facts.some((fact) => fact.includes("5xx")));
  assert.ok(completed.result.sources.length >= 3);
  assert.equal(completed.result.requires_human_approval, true);
  assert.equal(app.approvals.list({ taskId: task.task_id }).length, 1);
});

test("routes customer success tasks and keeps external message as a draft", async () => {
  const app = createApp();
  const task = app.dispatcher.createTask({
    prompt: "Dame contexto de la cuenta Acme y prepara respuesta para el cliente sobre exportacion",
    requested_by: { id: "lucia", team: "cs", roles: ["cs"] },
    domain_hint: "customer_success"
  });

  await nextTick();
  const completed = app.dispatcher.getTask(task.task_id);

  assert.equal(completed.status, "completed");
  assert.equal(completed.event.domain, "customer_success");
  assert.match(completed.result.account_summary, /ACME/);
  assert.equal(typeof completed.result.draft_response, "string");
  assert.ok(completed.result.missing_information.includes("External email sending is disabled."));
});

test("blocks sensitive tool access when requester lacks role", async () => {
  const app = createApp();
  const task = app.dispatcher.createTask({
    prompt: "Investiga por que subieron los errores 5xx del servicio billing-api",
    requested_by: { id: "guest", team: "ops", roles: ["requester"] },
    domain_hint: "sre"
  });

  await nextTick();
  const dlq = app.bus.list("task.dispatch.dlq");

  assert.equal(app.dispatcher.getTask(task.task_id).status, "failed");
  assert.equal(dlq.length, 1);
  assert.match(dlq[0].reason, /permission/i);
});

test("records prompt injection evidence from untrusted tool content", async () => {
  const app = createApp();
  const task = app.dispatcher.createTask({
    prompt: "Investiga por que subieron los errores 5xx del servicio billing-api",
    requested_by: { id: "ana", team: "sre", roles: ["sre"] },
    domain_hint: "sre"
  });

  await nextTick();
  const securityEvents = app.audit
    .list({ taskId: task.task_id })
    .filter((event) => event.type === "security.prompt_injection_detected");

  assert.equal(securityEvents.length, 1);
  assert.equal(securityEvents[0].tool_name, "datadogGetServiceSignals");
});

test("dispatcher redacts secrets from final task output", async () => {
  const app = createApp();
  const task = app.dispatcher.createTask({
    prompt: "Dame contexto de la cuenta Acme",
    requested_by: { id: "lucia", team: "cs", roles: ["cs"] },
    domain_hint: "customer_success"
  });

  await nextTick();
  app.bus.publish("task.result", {
    task_id: task.task_id,
    worker: "test-worker",
    result: {
      summary: "Contact security@example.com with sk-123456789012 and AKIA1234567890ABCDEF",
      cost: { model: "claude-sonnet", estimated_usd: 0 }
    }
  });
  await nextTick();
  const completed = app.dispatcher.getTask(task.task_id);
  const serialized = JSON.stringify(completed.result);

  assert.ok(!serialized.includes("security@example.com"));
  assert.ok(!serialized.includes("sk-123456789012"));
  assert.ok(!serialized.includes("AKIA1234567890ABCDEF"));
  assert.ok(serialized.includes("[REDACTED_EMAIL]"));
  assert.ok(app.audit.list({ taskId: task.task_id }).some((event) => event.type === "security.output_redacted"));
});

test("security review summarizes injection, approvals and redactions", async () => {
  const app = createApp();
  const task = app.dispatcher.createTask({
    prompt: "Investiga por que subieron los errores 5xx del servicio billing-api",
    requested_by: { id: "ana", team: "sre", roles: ["sre"] },
    domain_hint: "sre"
  });

  await nextTick();
  const review = app.securityReviews.reviewTask(task.task_id);

  assert.equal(review.security_status, "needs_review");
  assert.ok(review.findings.some((finding) => finding.code === "prompt_injection_detected"));
  assert.ok(review.findings.some((finding) => finding.code === "pending_approval"));
  assert.equal(review.approvals.length, 1);
});

test("knowledge graph search returns temporal sourced context", async () => {
  const app = createApp();
  const result = app.knowledgeGraph.search({
    query: "billing-api 5xx runbook owner",
    entity_filters: ["Service", "Runbook", "Team"],
    min_confidence: 0.6
  });

  assert.ok(result.results.length >= 2);
  assert.ok(result.results.some((item) => item.entity.name === "billing-api"));
  assert.ok(result.results.every((item) => item.entity.source?.ref));
});

test("workers include memory context in completed results", async () => {
  const app = createApp();
  const task = app.dispatcher.createTask({
    prompt: "Investiga por que subieron los errores 5xx del servicio billing-api",
    requested_by: { id: "ana", team: "sre", roles: ["sre"] },
    domain_hint: "sre"
  });

  await nextTick();
  const completed = app.dispatcher.getTask(task.task_id);

  assert.ok(completed.result.memory_context.length >= 1);
  assert.ok(completed.result.sources.some((source) => source.tool === "seed" || source.tool === "notion"));
});

test("approval decisions are audited", async () => {
  const app = createApp();
  const task = app.dispatcher.createTask({
    prompt: "Investiga por que subieron los errores 5xx del servicio billing-api",
    requested_by: { id: "ana", team: "sre", roles: ["sre"] },
    domain_hint: "sre"
  });

  await nextTick();
  const [approval] = app.approvals.list({ taskId: task.task_id });
  const decided = app.approvals.decide(approval.approval_id, {
    decision: "approved",
    decidedBy: { id: "oncall", roles: ["admin"] },
    comment: "Looks good"
  });

  assert.equal(decided.status, "approved");
  assert.ok(app.audit.list({ taskId: task.task_id }).some((event) => event.type === "approval.decide"));
});

test("metrics summarize task cost and platform counters", async () => {
  const app = createApp();
  app.dispatcher.createTask({
    prompt: "Dame contexto de la cuenta Acme y prepara respuesta para el cliente sobre exportacion",
    requested_by: { id: "lucia", team: "cs", roles: ["cs"] },
    domain_hint: "customer_success"
  });

  await nextTick();
  const metrics = buildMetrics(app);

  assert.equal(metrics.totals.tasks, 1);
  assert.equal(metrics.totals.completed, 1);
  assert.ok(metrics.totals.estimated_usd > 0);
  assert.equal(metrics.by_team[0].key, "cs");
});

test("tool call budget sends task to DLQ when exceeded", async () => {
  const app = createApp();
  const task = app.dispatcher.createTask({
    prompt: "Investiga por que subieron los errores 5xx del servicio billing-api",
    requested_by: { id: "ana", team: "sre", roles: ["sre"] },
    domain_hint: "sre",
    metadata: {
      budget: { max_tool_calls: 1 }
    }
  });

  await nextTick();
  const failed = app.dispatcher.getTask(task.task_id);
  const dlq = app.bus.list("task.dispatch.dlq");

  assert.equal(failed.status, "failed");
  assert.match(failed.error.reason, /tool calls budget/i);
  assert.equal(dlq.length, 1);
});

test("cost budget marks completed worker result as failed and records DLQ", async () => {
  const app = createApp();
  const task = app.dispatcher.createTask({
    prompt: "Dame contexto de la cuenta Acme y prepara respuesta para el cliente sobre exportacion",
    requested_by: { id: "lucia", team: "cs", roles: ["cs"] },
    domain_hint: "customer_success",
    metadata: {
      budget: { max_usd: 0.000001 }
    }
  });

  await nextTick();
  const failed = app.dispatcher.getTask(task.task_id);
  const dlq = app.bus.list("task.dispatch.dlq");

  assert.equal(failed.status, "failed");
  assert.equal(failed.error.code, "budget_exceeded");
  assert.equal(dlq.length, 1);
  assert.equal(dlq[0].failed_stream, "task.result");
});

test("DLQ events can be replayed onto their original stream", async () => {
  const app = createApp();
  app.dispatcher.createTask({
    prompt: "Investiga por que subieron los errores 5xx del servicio billing-api",
    requested_by: { id: "guest", team: "ops", roles: ["requester"] },
    domain_hint: "sre"
  });

  await nextTick();
  const [dlqEvent] = app.bus.list("task.dispatch.dlq");
  const replayed = app.bus.replayDlq(dlqEvent.event_id);

  assert.equal(replayed.stream, "task.dispatch.sre-support");
  assert.equal(replayed.replayed_from, dlqEvent.event_id);
});

test("L2 actions require approved approval before execution", async () => {
  const app = createApp();

  assert.throws(
    () => app.actions.executeAction({
      actionType: "github.create_internal_issue_draft",
      proposedAction: { title: "unsafe direct action" },
      actor: { id: "admin", roles: ["admin"] },
      taskId: "task-1"
    }),
    /approved approval_id/
  );
});

test("pending approvals cannot be executed", async () => {
  const app = createApp();
  const approval = app.approvals.create({
    taskId: "task-1",
    requestedBy: "sre-worker",
    actionType: "github.create_internal_issue_draft",
    riskLevel: "medium",
    proposedAction: { title: "Investigate" },
    reasoningSummary: "Needs human review"
  });

  assert.throws(
    () => app.actions.executeApproval(approval.approval_id, { id: "admin", roles: ["admin"] }),
    /not approved/
  );
});

test("approved L2 actions execute in controlled mode and are audited", async () => {
  const app = createApp();
  const approval = app.approvals.create({
    taskId: "task-1",
    requestedBy: "sre-worker",
    actionType: "github.create_internal_issue_draft",
    riskLevel: "medium",
    proposedAction: { title: "Investigate" },
    reasoningSummary: "Needs human review"
  });
  app.approvals.decide(approval.approval_id, {
    decision: "approved",
    decidedBy: { id: "oncall", roles: ["admin"] }
  });

  const execution = app.actions.executeApproval(approval.approval_id, { id: "admin", roles: ["admin"] });

  assert.equal(execution.status, "executed");
  assert.equal(execution.action_level, "L2");
  assert.equal(execution.result.mode, "simulated");
  assert.ok(app.audit.list({ taskId: "task-1" }).some((event) => event.type === "action.executed"));
});

test("L4 actions are blocked outside the MVP", async () => {
  const app = createApp();

  assert.throws(
    () => app.actions.executeAction({
      actionType: "aws.rollback_service",
      proposedAction: { service: "billing-api" },
      actor: { id: "admin", roles: ["admin"] },
      taskId: "task-1",
      approvalId: "approval-1"
    }),
    /outside the MVP/
  );
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exitCode = 1;
} else {
  console.log(`${tests.length} test(s) passed`);
}
