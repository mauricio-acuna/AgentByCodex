import { AppError } from "../core/errors.js";
import { nowIso, uuid } from "../core/ids.js";

export class ApprovalStore {
  constructor({ audit }) {
    this.audit = audit;
    this.approvals = new Map();
  }

  create({ taskId, requestedBy, actionType, riskLevel, proposedAction, reasoningSummary, sources = [] }) {
    const approval = {
      approval_id: uuid(),
      task_id: taskId,
      requested_by: requestedBy,
      action_type: actionType,
      risk_level: riskLevel,
      proposed_action: proposedAction,
      reasoning_summary: reasoningSummary,
      sources,
      status: "pending",
      created_at: nowIso(),
      decided_at: null,
      decided_by: null,
      decision_comment: null
    };
    this.approvals.set(approval.approval_id, approval);
    this.audit?.record("approval.create", { task_id: taskId, approval_id: approval.approval_id, action_type: actionType });
    return approval;
  }

  decide(approvalId, { decision, decidedBy, comment }) {
    const approval = this.approvals.get(approvalId);
    if (!approval) throw new AppError("Approval not found", { code: "not_found", status: 404 });
    if (!["approved", "rejected"].includes(decision)) {
      throw new AppError("decision must be approved or rejected", { code: "validation_error" });
    }
    if (approval.status !== "pending") {
      throw new AppError("Approval already decided", { code: "invalid_state" });
    }
    approval.status = decision;
    approval.decided_at = nowIso();
    approval.decided_by = decidedBy;
    approval.decision_comment = comment || null;
    this.audit?.record("approval.decide", { task_id: approval.task_id, approval_id: approvalId, decision });
    return approval;
  }

  list({ taskId, status } = {}) {
    return [...this.approvals.values()].filter((approval) => {
      if (taskId && approval.task_id !== taskId) return false;
      if (status && approval.status !== status) return false;
      return true;
    });
  }
}

