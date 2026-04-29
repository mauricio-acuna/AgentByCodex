import { AppError } from "../core/errors.js";
import { nowIso, uuid } from "../core/ids.js";

export const STREAMS = {
  DISPATCH: "task.dispatch",
  SRE: "task.dispatch.sre-support",
  CS: "task.dispatch.cs-assistant",
  RESULT: "task.result",
  DLQ: "task.dispatch.dlq",
  LIFECYCLE: "agent.lifecycle",
  HEALTH: "signal.health",
  CANCEL: "signal.cancel"
};

export class InMemoryStreamBus {
  constructor({ audit }) {
    this.audit = audit;
    this.streams = new Map();
    this.consumers = new Map();
    this.cancelledTasks = new Set();
  }

  publish(stream, payload) {
    const event = {
      event_id: payload.event_id || uuid(),
      stream,
      created_at: nowIso(),
      ...payload
    };
    const events = this.streams.get(stream) || [];
    events.push(event);
    this.streams.set(stream, events);
    this.audit?.record("bus.publish", { task_id: event.task_id, stream, event_id: event.event_id });
    this.deliver(stream, event);
    return event;
  }

  subscribe(stream, consumerName, handler) {
    if (!this.consumers.has(stream)) this.consumers.set(stream, []);
    this.consumers.get(stream).push({ consumerName, handler });
    this.audit?.record("bus.subscribe", { stream, consumer: consumerName });
  }

  async deliver(stream, event) {
    const consumers = this.consumers.get(stream) || [];
    for (const consumer of consumers) {
      try {
        await consumer.handler(event);
      } catch (error) {
        this.publish(STREAMS.DLQ, {
          task_id: event.task_id,
          failed_stream: stream,
          failed_consumer: consumer.consumerName,
          reason: error.message,
          original_event: event
        });
      }
    }
  }

  cancelTask(taskId, reason = "cancelled_by_user") {
    if (!taskId) {
      throw new AppError("task_id is required to cancel a task", { code: "validation_error" });
    }
    this.cancelledTasks.add(taskId);
    return this.publish(STREAMS.CANCEL, { task_id: taskId, reason });
  }

  isCancelled(taskId) {
    return this.cancelledTasks.has(taskId);
  }

  list(stream) {
    return [...(this.streams.get(stream) || [])];
  }

  snapshot() {
    return {
      streams: Object.fromEntries(this.streams.entries()),
      cancelledTasks: [...this.cancelledTasks]
    };
  }

  load(snapshot = {}) {
    this.streams = new Map(Object.entries(snapshot.streams || {}));
    this.cancelledTasks = new Set(snapshot.cancelledTasks || []);
  }

  replayDlq(eventId) {
    const dlqEvent = this.list(STREAMS.DLQ).find((event) => event.event_id === eventId);
    if (!dlqEvent) {
      throw new AppError("DLQ event not found", { code: "not_found", status: 404 });
    }
    if (!dlqEvent.failed_stream || !dlqEvent.original_event) {
      throw new AppError("DLQ event cannot be replayed", { code: "invalid_state" });
    }
    this.audit?.record("bus.dlq_replay", {
      task_id: dlqEvent.task_id,
      dlq_event_id: eventId,
      target_stream: dlqEvent.failed_stream
    });
    return this.publish(dlqEvent.failed_stream, {
      ...dlqEvent.original_event,
      event_id: uuid(),
      replayed_from: eventId
    });
  }
}
