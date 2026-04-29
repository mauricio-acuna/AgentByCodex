import { ApprovalStore } from "./approvals/approvalStore.js";
import { ActionExecutor } from "./actions/actionExecutor.js";
import { AuditLog } from "./core/audit.js";
import { BudgetGuard } from "./core/budgetGuard.js";
import { InMemoryStreamBus } from "./bus/inMemoryStreamBus.js";
import { Dispatcher } from "./dispatcher/dispatcher.js";
import { KnowledgeGraph } from "./memory/knowledgeGraph.js";
import { JsonStateStore } from "./persistence/jsonStateStore.js";
import { PolicyEngine } from "./security/policies.js";
import { SecurityReviewService } from "./security/securityReview.js";
import { ToolRegistry } from "./tools/mockTools.js";
import { SreWorker } from "./workers/sreWorker.js";
import { CsWorker } from "./workers/csWorker.js";
import { STREAMS } from "./bus/inMemoryStreamBus.js";

export function createApp({ stateFile = null } = {}) {
  const audit = new AuditLog();
  const bus = new InMemoryStreamBus({ audit });
  const approvals = new ApprovalStore({ audit });
  const policy = new PolicyEngine({ audit });
  const actions = new ActionExecutor({ approvals, policy, audit });
  const securityReviews = new SecurityReviewService({
    dispatcher: null,
    approvals,
    actions,
    audit
  });
  const budgetGuard = new BudgetGuard({ audit });
  const knowledgeGraph = new KnowledgeGraph({ audit });
  const tools = new ToolRegistry({ policy, audit, knowledgeGraph, budgetGuard });
  const dispatcher = new Dispatcher({ bus, audit, budgetGuard });
  securityReviews.dispatcher = dispatcher;
  const stateStore = stateFile ? new JsonStateStore({ path: stateFile, audit }) : null;
  dispatcher.attachResultListener();

  const sreWorker = new SreWorker({ name: "sre-worker", bus, tools, approvals, audit });
  const csWorker = new CsWorker({ name: "cs-worker", bus, tools, approvals, audit });
  sreWorker.attach(STREAMS.SRE);
  csWorker.attach(STREAMS.CS);

  return {
    audit,
    bus,
    approvals,
    actions,
    budgetGuard,
    knowledgeGraph,
    policy,
    securityReviews,
    tools,
    dispatcher,
    stateStore,
    workers: { sreWorker, csWorker }
  };
}
