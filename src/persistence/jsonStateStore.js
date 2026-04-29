import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class JsonStateStore {
  constructor({ path, audit }) {
    this.path = path;
    this.audit = audit;
  }

  async save(app) {
    const snapshot = {
      saved_at: new Date().toISOString(),
      audit: app.audit.snapshot(),
      dispatcher: app.dispatcher.snapshot(),
      approvals: app.approvals.snapshot(),
      actions: app.actions.snapshot(),
      knowledgeGraph: app.knowledgeGraph.snapshot(),
      budgetGuard: app.budgetGuard.snapshot(),
      bus: app.bus.snapshot()
    };
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(snapshot, null, 2), "utf8");
    this.audit?.record("state.save", { path: this.path });
    return snapshot;
  }

  async load(app) {
    const raw = await readFile(this.path, "utf8");
    const snapshot = JSON.parse(raw);
    app.audit.load(snapshot.audit || []);
    app.dispatcher.load(snapshot.dispatcher || {});
    app.approvals.load(snapshot.approvals || []);
    app.actions.load(snapshot.actions || []);
    app.knowledgeGraph.load(snapshot.knowledgeGraph || {});
    app.budgetGuard.load(snapshot.budgetGuard || []);
    app.bus.load(snapshot.bus || {});
    app.audit.record("state.load", { path: this.path });
    return snapshot;
  }
}

