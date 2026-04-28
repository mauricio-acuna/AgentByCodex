export function buildMetrics({ dispatcher, approvals, audit, knowledgeGraph }) {
  const tasks = dispatcher.listTasks();
  const completed = tasks.filter((task) => task.status === "completed");
  const failed = tasks.filter((task) => task.status === "failed");
  const approvalsList = approvals.list();
  const costByTask = completed.map((task) => ({
    task_id: task.task_id,
    team: task.event.requested_by.team,
    worker: task.event.worker,
    model: task.result?.cost?.model || "unknown",
    estimated_usd: task.result?.cost?.estimated_usd || 0
  }));

  return {
    totals: {
      tasks: tasks.length,
      completed: completed.length,
      failed: failed.length,
      approvals_pending: approvalsList.filter((approval) => approval.status === "pending").length,
      approvals_decided: approvalsList.filter((approval) => approval.status !== "pending").length,
      audit_events: audit.list().length,
      knowledge_entities: knowledgeGraph.snapshot().entities.length,
      knowledge_relations: knowledgeGraph.snapshot().relations.length,
      estimated_usd: Number(costByTask.reduce((sum, item) => sum + item.estimated_usd, 0).toFixed(6))
    },
    by_team: groupCost(costByTask, "team"),
    by_worker: groupCost(costByTask, "worker"),
    by_model: groupCost(costByTask, "model"),
    cost_by_task: costByTask
  };
}

function groupCost(items, field) {
  const groups = new Map();
  for (const item of items) {
    const key = item[field] || "unknown";
    const current = groups.get(key) || { key, tasks: 0, estimated_usd: 0 };
    current.tasks += 1;
    current.estimated_usd = Number((current.estimated_usd + item.estimated_usd).toFixed(6));
    groups.set(key, current);
  }
  return [...groups.values()];
}

