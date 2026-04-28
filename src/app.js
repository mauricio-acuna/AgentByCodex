import { ApprovalStore } from "./approvals/approvalStore.js";
import { AuditLog } from "./core/audit.js";
import { BudgetGuard } from "./core/budgetGuard.js";
import { InMemoryStreamBus } from "./bus/inMemoryStreamBus.js";
import { Dispatcher } from "./dispatcher/dispatcher.js";
import { KnowledgeGraph } from "./memory/knowledgeGraph.js";
import { PolicyEngine } from "./security/policies.js";
import { ToolRegistry } from "./tools/mockTools.js";
import { SreWorker } from "./workers/sreWorker.js";
import { CsWorker } from "./workers/csWorker.js";
import { STREAMS } from "./bus/inMemoryStreamBus.js";

export function createApp() {
  const audit = new AuditLog();
  const bus = new InMemoryStreamBus({ audit });
  const approvals = new ApprovalStore({ audit });
  const policy = new PolicyEngine({ audit });
  const budgetGuard = new BudgetGuard({ audit });
  const knowledgeGraph = new KnowledgeGraph({ audit });
  const tools = new ToolRegistry({ policy, audit, knowledgeGraph, budgetGuard });
  const dispatcher = new Dispatcher({ bus, audit, budgetGuard });
  dispatcher.attachResultListener();

  const sreWorker = new SreWorker({ name: "sre-worker", bus, tools, approvals, audit });
  const csWorker = new CsWorker({ name: "cs-worker", bus, tools, approvals, audit });
  sreWorker.attach(STREAMS.SRE);
  csWorker.attach(STREAMS.CS);

  return {
    audit,
    bus,
    approvals,
    budgetGuard,
    knowledgeGraph,
    policy,
    tools,
    dispatcher,
    workers: { sreWorker, csWorker }
  };
}
