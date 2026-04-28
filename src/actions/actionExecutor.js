import { AppError } from "../core/errors.js";
import { nowIso, uuid } from "../core/ids.js";
import { ACTION_LEVELS } from "../security/policies.js";

export const ACTION_CATALOG = {
  "github.create_internal_issue_draft": {
    level: ACTION_LEVELS.L2,
    description: "Create an internal GitHub issue draft"
  },
  "jira.update_ticket": {
    level: ACTION_LEVELS.L2,
    description: "Update an internal Jira ticket"
  },
  "circleci.rerun_pipeline": {
    level: ACTION_LEVELS.L3,
    description: "Rerun a CI pipeline"
  },
  "aws.rollback_service": {
    level: ACTION_LEVELS.L4,
    description: "Rollback a production service"
  }
};

export class ActionExecutor {
  constructor({ approvals, policy, audit }) {
    this.approvals = approvals;
    this.policy = policy;
    this.audit = audit;
    this.executions = new Map();
  }

  executeAction({ actionType, proposedAction, actor, taskId, approvalId = null }) {
    const action = ACTION_CATALOG[actionType];
    if (!action) {
      throw new AppError("Unknown action type", {
        code: "unknown_action",
        status: 400,
        details: { action_type: actionType }
      });
    }

    if (action.level === ACTION_LEVELS.L4) {
      this.audit?.record("action.blocked", {
        task_id: taskId,
        action_type: actionType,
        reason: "L4 actions are outside MVP"
      });
      throw new AppError("L4 actions are outside the MVP", {
        code: "action_out_of_scope",
        status: 403,
        details: { action_type: actionType, action_level: action.level }
      });
    }

    this.policy.assertCanAccess(actor, action.level, {
      taskId,
      toolName: actionType
    });

    if (this.policy.requiresApproval(action.level)) {
      if (!approvalId) {
        this.audit?.record("action.blocked", {
          task_id: taskId,
          action_type: actionType,
          reason: "missing approval"
        });
        throw new AppError("Action requires an approved approval_id", {
          code: "approval_required",
          status: 403,
          details: { action_type: actionType, action_level: action.level }
        });
      }

      const approval = this.approvals.get(approvalId);
      if (approval.status !== "approved") {
        this.audit?.record("action.blocked", {
          task_id: taskId,
          action_type: actionType,
          approval_id: approvalId,
          approval_status: approval.status
        });
        throw new AppError("Approval is not approved", {
          code: "approval_not_approved",
          status: 403,
          details: { approval_id: approvalId, status: approval.status }
        });
      }

      if (approval.action_type !== actionType) {
        throw new AppError("Approval action type does not match execution request", {
          code: "approval_mismatch",
          status: 400,
          details: { approval_action_type: approval.action_type, action_type: actionType }
        });
      }
    }

    const execution = {
      execution_id: uuid(),
      task_id: taskId,
      approval_id: approvalId,
      action_type: actionType,
      action_level: action.level,
      status: "executed",
      executed_by: actor,
      executed_at: nowIso(),
      result: this.simulate(actionType, proposedAction)
    };
    this.executions.set(execution.execution_id, execution);
    this.audit?.record("action.executed", {
      task_id: taskId,
      approval_id: approvalId,
      execution_id: execution.execution_id,
      action_type: actionType,
      action_level: action.level
    });
    return execution;
  }

  executeApproval(approvalId, actor) {
    const approval = this.approvals.get(approvalId);
    return this.executeAction({
      actionType: approval.action_type,
      proposedAction: approval.proposed_action,
      actor,
      taskId: approval.task_id,
      approvalId
    });
  }

  simulate(actionType, proposedAction) {
    return {
      mode: "simulated",
      message: `${actionType} executed in controlled MVP mode`,
      payload: proposedAction
    };
  }

  list({ taskId } = {}) {
    return [...this.executions.values()].filter((execution) => {
      if (taskId && execution.task_id !== taskId) return false;
      return true;
    });
  }
}

