export class SecurityReviewService {
  constructor({ dispatcher, approvals, actions, audit }) {
    this.dispatcher = dispatcher;
    this.approvals = approvals;
    this.actions = actions;
    this.audit = audit;
  }

  reviewTask(taskId) {
    const task = this.dispatcher.getTask(taskId);
    const events = this.audit.list({ taskId });
    const approvals = this.approvals.list({ taskId });
    const executions = this.actions.list({ taskId });

    const findings = [];
    for (const event of events) {
      if (event.type === "security.prompt_injection_detected") {
        findings.push({
          severity: "high",
          code: "prompt_injection_detected",
          message: `Suspicious instruction detected in ${event.tool_name}`,
          evidence: event.matches || []
        });
      }
      if (event.type === "security.output_redacted") {
        findings.push({
          severity: "medium",
          code: "output_redacted",
          message: "Sensitive content was redacted from final output",
          evidence: [event.field || "task.result"]
        });
      }
      if (event.type === "policy.access_check" && event.allowed === false) {
        findings.push({
          severity: "high",
          code: "permission_denied",
          message: `Access denied for ${event.tool_name}`,
          evidence: [event.action_level]
        });
      }
      if (event.type === "action.blocked") {
        findings.push({
          severity: "high",
          code: "action_blocked",
          message: event.reason,
          evidence: [event.action_type]
        });
      }
      if (event.type === "budget.exceeded") {
        findings.push({
          severity: "medium",
          code: "budget_exceeded",
          message: `${event.dimension} exceeded budget`,
          evidence: [`${event.current} > ${event.limit}`]
        });
      }
    }

    const pendingApprovals = approvals.filter((approval) => approval.status === "pending");
    if (pendingApprovals.length > 0) {
      findings.push({
        severity: "medium",
        code: "pending_approval",
        message: "Task has pending approval requests",
        evidence: pendingApprovals.map((approval) => approval.approval_id)
      });
    }

    const riskScore = findings.reduce((score, finding) => {
      if (finding.severity === "high") return score + 3;
      if (finding.severity === "medium") return score + 2;
      return score + 1;
    }, 0);

    const review = {
      task_id: taskId,
      task_status: task.status,
      risk_level: task.event.risk_level,
      security_status: riskScore >= 5 ? "needs_review" : findings.length ? "watch" : "clear",
      risk_score: riskScore,
      findings,
      approvals: approvals.map((approval) => ({
        approval_id: approval.approval_id,
        status: approval.status,
        action_type: approval.action_type
      })),
      executions: executions.map((execution) => ({
        execution_id: execution.execution_id,
        status: execution.status,
        action_type: execution.action_type
      }))
    };

    this.audit.record("security.review", {
      task_id: taskId,
      security_status: review.security_status,
      risk_score: riskScore,
      finding_count: findings.length
    });
    return review;
  }
}

