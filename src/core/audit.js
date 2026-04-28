import { nowIso } from "./ids.js";

export class AuditLog {
  constructor() {
    this.events = [];
  }

  record(type, payload = {}) {
    const event = {
      type,
      at: nowIso(),
      ...payload
    };
    this.events.push(event);
    return event;
  }

  list({ taskId } = {}) {
    if (!taskId) return [...this.events];
    return this.events.filter((event) => event.task_id === taskId);
  }
}

