import { BaseWorker } from "./baseWorker.js";

function extractService(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes("billing")) return "billing-api";
  return "billing-api";
}

function extractRepo(prompt) {
  const match = prompt.match(/repo\s+([a-z0-9_-]+)/i);
  return match?.[1] || "backend";
}

export class SreWorker extends BaseWorker {
  async handle(event) {
    const prompt = event.payload.prompt;
    if (/pipeline|circleci|build/i.test(prompt)) {
      return this.handlePipeline(event);
    }
    return this.handleIncident(event);
  }

  async handleIncident(event) {
    const service = extractService(event.payload.prompt);
    const context = { task_id: event.task_id, requested_by: event.requested_by };
    const [signals, prs, runbooks, memory] = await Promise.all([
      this.tools.call("datadogGetServiceSignals", { service }, context),
      this.tools.call("githubGetRecentPrs", { service }, context),
      this.tools.call("notionSearchDocs", { query: `${service} 5xx runbook` }, context),
      this.tools.call(
        "knowledgeSearch",
        {
          query: `${service} 5xx owner runbook incident`,
          entity_filters: ["Service", "Runbook", "Incident", "Team"],
          max_results: 5,
          min_confidence: 0.6
        },
        context
      )
    ]);

    const facts = [
      signals.metrics.error_rate,
      signals.metrics.latency_p95,
      ...prs.recent_prs.map((pr) => `Recent PR #${pr.id}: ${pr.title}, merged ${pr.merged_at}`),
      ...memory.results.map((item) => `Memory: ${item.entity.type} ${item.entity.name} - ${item.entity.summary}`)
    ].filter(Boolean);

    const hypotheses = [
      {
        description: "Recent concurrency changes may have exhausted the database connection pool.",
        confidence: 0.78,
        supporting_sources: [...signals.sources, ...prs.sources]
      }
    ];

    const recommended_actions = [
      "Validate DB connection pool saturation in Datadog.",
      "Review PR 1842 for concurrency changes.",
      "Temporarily reduce invoice export concurrency if confirmed.",
      "Prepare an internal incident update before any customer-facing communication."
    ];

    const approval = this.approvals.create({
      taskId: event.task_id,
      requestedBy: this.name,
      actionType: "github.create_internal_issue_draft",
      riskLevel: "medium",
      proposedAction: {
        title: `Investigate ${service} 5xx spike`,
        body: "Draft issue prepared by SRE Worker. Requires human review before posting."
      },
      reasoningSummary: "Incident triage found DB pool exhaustion symptoms after a concurrency-related PR.",
      sources: [...signals.sources, ...prs.sources, ...runbooks.sources, ...memory.sources]
    });

    return {
      summary: `${service} shows elevated 5xx and latency correlated with DB pool exhaustion logs and a recent concurrency PR.`,
      severity_estimate: "high",
      facts,
      hypotheses,
      recommended_actions,
      requires_human_approval: true,
      approval_request: approval,
      sources: [...signals.sources, ...prs.sources, ...runbooks.sources, ...memory.sources],
      memory_context: memory.results,
      missing_information: ["Confirm active DB pool metrics and customer impact window."],
      cost: this.costFor(event.payload.prompt)
    };
  }

  async handlePipeline(event) {
    const repo = extractRepo(event.payload.prompt);
    const context = { task_id: event.task_id, requested_by: event.requested_by };
    const pipeline = await this.tools.call("circleciGetFailedPipeline", { repo }, context);
    return {
      summary: `CircleCI pipeline for ${repo} failed in job ${pipeline.failed_job || "unknown"}.`,
      severity_estimate: "medium",
      facts: [pipeline.log_excerpt].filter(Boolean),
      hypotheses: [
        {
          description: "Integration tests are blocked by a database migration lock.",
          confidence: pipeline.log_excerpt ? 0.82 : 0.35,
          supporting_sources: pipeline.sources
        }
      ],
      recommended_actions: [
        "Inspect concurrent migration jobs.",
        "Rerun only after confirming no active migration lock.",
        "Ask repo owner to review invoice_export_worker integration test isolation."
      ],
      requires_human_approval: false,
      sources: pipeline.sources,
      missing_information: pipeline.log_excerpt ? [] : ["Pipeline logs were unavailable."],
      cost: this.costFor(event.payload.prompt)
    };
  }
}
