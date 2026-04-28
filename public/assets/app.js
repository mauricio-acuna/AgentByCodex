const state = {
  tasks: [],
  selectedTaskId: null,
  approvals: [],
  knowledge: [],
  metrics: null,
  dlq: [],
  securityReview: null,
  audit: []
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || "Request failed");
  }
  return payload;
}

function pill(value) {
  return `<span class="pill ${String(value).toLowerCase()}">${value}</span>`;
}

function list(items) {
  if (!items || items.length === 0) return "<span class='muted'>none</span>";
  return `<ul>${items.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}</ul>`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTasks() {
  $("#task-count").textContent = String(state.tasks.length);
  const root = $("#tasks-list");
  root.innerHTML = state.tasks
    .map((task) => {
      const selected = task.task_id === state.selectedTaskId ? "selected" : "";
      return `
        <article class="item selectable ${selected}" data-task-id="${task.task_id}">
          <strong>${escapeHtml(task.event.task_type)}</strong>
          <p>${escapeHtml(task.event.payload.prompt)}</p>
          <div class="meta">
            ${pill(task.status)}
            ${pill(task.event.domain)}
            ${pill(task.event.risk_level)}
            <span class="pill muted">${escapeHtml(task.event.worker)}</span>
          </div>
        </article>
      `;
    })
    .join("");

  $$("#tasks-list .item").forEach((item) => {
    item.addEventListener("click", () => {
      state.selectedTaskId = item.dataset.taskId;
      renderTasks();
      renderResult();
      loadSecurityReview();
    });
  });
}

function renderResult() {
  const task = state.tasks.find((candidate) => candidate.task_id === state.selectedTaskId);
  const status = $("#selected-task-status");
  const root = $("#result-view");

  if (!task) {
    status.textContent = "none";
    status.className = "pill muted";
    root.className = "result-empty";
    root.textContent = "Select a task.";
    return;
  }

  status.textContent = task.status;
  status.className = `pill ${task.status}`;
  root.className = "result-grid";

  if (task.error) {
    root.innerHTML = `
      <div class="kv"><strong>Error</strong><pre>${escapeHtml(JSON.stringify(task.error, null, 2))}</pre></div>
    `;
    return;
  }

  const result = task.result || {};
  root.innerHTML = `
    <div class="kv"><strong>Summary</strong><p>${escapeHtml(result.summary || result.account_summary || "No result yet.")}</p></div>
    <div class="kv"><strong>Facts / Open items</strong>${renderFacts(result)}</div>
    <div class="kv"><strong>Recommendations</strong>${list(result.recommended_actions || result.recommended_next_steps || [])}</div>
    <div class="kv"><strong>Sources</strong>${renderSources(result.sources || [])}</div>
    <div class="kv"><strong>Cost</strong><pre>${escapeHtml(JSON.stringify(result.cost || {}, null, 2))}</pre></div>
  `;
}

function renderFacts(result) {
  if (result.facts) return list(result.facts);
  if (result.open_items) return `<pre>${escapeHtml(JSON.stringify(result.open_items, null, 2))}</pre>`;
  return "<span class='pill muted'>none</span>";
}

function renderSecurityReview() {
  const status = $("#security-status");
  const root = $("#security-review");
  const review = state.securityReview;

  if (!state.selectedTaskId) {
    status.textContent = "none";
    status.className = "pill muted";
    root.className = "result-empty";
    root.textContent = "Select a task from Tasks.";
    return;
  }

  if (!review) {
    status.textContent = "not loaded";
    status.className = "pill muted";
    root.className = "result-empty";
    root.textContent = "No review available.";
    return;
  }

  status.textContent = review.security_status;
  status.className = `pill ${review.security_status === "needs_review" ? "failed" : "completed"}`;
  root.className = "result-grid";
  root.innerHTML = `
    <div class="kv"><strong>Risk score</strong><p>${escapeHtml(String(review.risk_score))}</p></div>
    <div class="kv"><strong>Findings</strong>${renderFindings(review.findings)}</div>
    <div class="kv"><strong>Approvals</strong><pre>${escapeHtml(JSON.stringify(review.approvals, null, 2))}</pre></div>
    <div class="kv"><strong>Executions</strong><pre>${escapeHtml(JSON.stringify(review.executions, null, 2))}</pre></div>
  `;
}

function renderFindings(findings) {
  if (!findings || findings.length === 0) return "<span class='pill completed'>clear</span>";
  return findings
    .map((finding) => `
      <article class="item">
        <strong>${escapeHtml(finding.code)}</strong>
        <p>${escapeHtml(finding.message)}</p>
        <div class="meta">${pill(finding.severity)}</div>
      </article>
    `)
    .join("");
}

function renderSources(sources) {
  if (sources.length === 0) return "<span class='pill muted'>none</span>";
  return `
    <ul>
      ${sources.map((source) => `<li>${escapeHtml(source.tool)}: ${escapeHtml(source.ref)}</li>`).join("")}
    </ul>
  `;
}

function renderApprovals() {
  $("#approval-count").textContent = String(state.approvals.length);
  $("#approvals-list").innerHTML = state.approvals
    .map((approval) => `
      <article class="item">
        <strong>${escapeHtml(approval.action_type)}</strong>
        <p>${escapeHtml(approval.reasoning_summary)}</p>
        <div class="meta">
          ${pill(approval.status)}
          ${pill(approval.risk_level)}
          <span class="pill muted">${escapeHtml(approval.task_id.slice(0, 8))}</span>
        </div>
        <pre>${escapeHtml(JSON.stringify(approval.proposed_action, null, 2))}</pre>
        ${
          approval.status === "pending"
            ? `<div class="meta">
                <button class="decision" data-approval-id="${approval.approval_id}" data-decision="approved">Approve</button>
                <button class="decision reject" data-approval-id="${approval.approval_id}" data-decision="rejected">Reject</button>
              </div>`
            : approval.status === "approved"
              ? `<div class="meta">
                  <button class="execute-action" data-approval-id="${approval.approval_id}">Execute</button>
                </div>`
            : ""
        }
      </article>
    `)
    .join("");

  $$(".decision").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/approvals/${button.dataset.approvalId}/decision`, {
        method: "POST",
        body: JSON.stringify({
          decision: button.dataset.decision,
          decidedBy: { id: "ui-user", roles: ["admin"] },
          comment: `Decision from UI: ${button.dataset.decision}`
        })
      });
      await refresh();
    });
  });

  $$(".execute-action").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/approvals/${button.dataset.approvalId}/execute`, {
        method: "POST",
        body: JSON.stringify({
          actor: { id: "ui-user", roles: ["admin"] }
        })
      });
      await refresh();
    });
  });
}

function renderKnowledge() {
  $("#knowledge-count").textContent = String(state.knowledge.length);
  $("#knowledge-list").innerHTML = state.knowledge
    .map((item) => `
      <article class="item">
        <strong>${escapeHtml(item.entity.type)} · ${escapeHtml(item.entity.name)}</strong>
        <p>${escapeHtml(item.entity.summary)}</p>
        <div class="meta">
          <span class="pill">confidence ${escapeHtml(String(item.entity.confidence))}</span>
          <span class="pill muted">${escapeHtml(item.entity.source?.tool || "unknown")}</span>
          <span class="pill muted">${escapeHtml(item.entity.source?.ref || "no-ref")}</span>
        </div>
        ${
          item.relations?.length
            ? `<pre>${escapeHtml(JSON.stringify(item.relations.map((relation) => ({
                type: relation.type,
                from: relation.from_entity,
                to: relation.to_entity
              })), null, 2))}</pre>`
            : ""
        }
      </article>
    `)
    .join("");
}

function renderMetrics() {
  const metrics = state.metrics;
  if (!metrics) return;
  $("#metrics-cost").textContent = `$${metrics.totals.estimated_usd}`;
  const cards = [
    ["Tasks", metrics.totals.tasks],
    ["Completed", metrics.totals.completed],
    ["Failed", metrics.totals.failed],
    ["Pending approvals", metrics.totals.approvals_pending],
    ["Audit events", metrics.totals.audit_events],
    ["KG entities", metrics.totals.knowledge_entities],
    ["KG relations", metrics.totals.knowledge_relations],
    ["Estimated USD", `$${metrics.totals.estimated_usd}`]
  ];
  $("#metrics-grid").innerHTML = cards
    .map(([label, value]) => `
      <article class="metric-card">
        <strong>${escapeHtml(String(value))}</strong>
        <span>${escapeHtml(label)}</span>
      </article>
    `)
    .join("");
}

function renderDlq() {
  $("#dlq-count").textContent = String(state.dlq.length);
  $("#dlq-list").innerHTML = state.dlq
    .map((event) => `
      <article class="item">
        <strong>${escapeHtml(event.reason || "Unknown failure")}</strong>
        <p>${escapeHtml(event.failed_stream || "unknown stream")} · ${escapeHtml(event.failed_consumer || "unknown consumer")}</p>
        <div class="meta">
          <span class="pill failed">failed</span>
          <span class="pill muted">${escapeHtml(event.task_id || "no-task")}</span>
          <button class="decision" data-dlq-id="${event.event_id}">Replay</button>
        </div>
        <pre>${escapeHtml(JSON.stringify(event.original_event || {}, null, 2))}</pre>
      </article>
    `)
    .join("");

  $$("#dlq-list .decision").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/dlq/${button.dataset.dlqId}/replay`, { method: "POST" });
      await refresh();
    });
  });
}

function renderAudit() {
  $("#audit-count").textContent = String(state.audit.length);
  $("#audit-list").innerHTML = state.audit
    .slice()
    .reverse()
    .map((event) => `
      <div class="audit-event">
        <div>
          <strong>${escapeHtml(event.type)}</strong>
          <small>${escapeHtml(event.at || "")}</small>
        </div>
        <pre>${escapeHtml(JSON.stringify(event, null, 2))}</pre>
      </div>
    `)
    .join("");
}

async function refresh() {
  const query = encodeURIComponent($("#knowledge-query")?.value || "billing-api");
  const [tasks, approvals, knowledge, metrics, dlq, audit] = await Promise.all([
    api("/tasks"),
    api("/approvals"),
    api(`/knowledge?q=${query}&limit=8&min_confidence=0.6`),
    api("/metrics"),
    api("/dlq"),
    api("/audit")
  ]);
  state.tasks = tasks.tasks;
  state.approvals = approvals.approvals;
  state.knowledge = knowledge.results || [];
  state.metrics = metrics;
  state.dlq = dlq.events || [];
  state.audit = audit.events;
  if (!state.selectedTaskId && state.tasks[0]) state.selectedTaskId = state.tasks[0].task_id;
  renderTasks();
  renderResult();
  renderApprovals();
  renderKnowledge();
  renderMetrics();
  renderDlq();
  renderAudit();
  await loadSecurityReview();
}

async function loadSecurityReview() {
  if (!state.selectedTaskId) {
    state.securityReview = null;
    renderSecurityReview();
    return;
  }

  try {
    state.securityReview = await api(`/tasks/${state.selectedTaskId}/security`);
  } catch {
    state.securityReview = null;
  }
  renderSecurityReview();
}

async function checkHealth() {
  try {
    await api("/health");
    $("#health-dot").classList.add("ok");
    $("#health-text").textContent = "Online";
  } catch {
    $("#health-dot").classList.remove("ok");
    $("#health-text").textContent = "Offline";
  }
}

function bindNavigation() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".nav-item").forEach((item) => item.classList.remove("active"));
      $$(".view").forEach((view) => view.classList.remove("active"));
      button.classList.add("active");
      $(`#view-${button.dataset.view}`).classList.add("active");
    });
  });
}

function bindForm() {
  $("#task-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const role = $("#role").value;
    await api("/tasks", {
      method: "POST",
      body: JSON.stringify({
        prompt: $("#prompt").value,
        domain_hint: $("#domain").value,
        requested_by: {
          id: "ui-user",
          team: role === "cs" ? "cs" : "sre",
          roles: [role]
        }
      })
    });
    await refresh();
  });

  $("#domain").addEventListener("change", () => {
    const domain = $("#domain").value;
    $("#role").value = domain === "customer_success" ? "cs" : "sre";
    $("#prompt").value =
      domain === "customer_success"
        ? "Dame contexto de la cuenta Acme y prepara respuesta para el cliente sobre exportacion"
        : "Investiga por que subieron los errores 5xx del servicio billing-api";
  });

  $("#refresh").addEventListener("click", refresh);

  $("#knowledge-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await refresh();
  });
}

bindNavigation();
bindForm();
await checkHealth();
await refresh();
