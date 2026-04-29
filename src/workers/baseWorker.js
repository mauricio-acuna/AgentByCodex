import { estimateCostUsd, estimateTokens, MODEL_POLICY } from "../core/costs.js";
import { STREAMS } from "../bus/inMemoryStreamBus.js";

export class BaseWorker {
  constructor({ name, bus, tools, approvals, audit }) {
    this.name = name;
    this.bus = bus;
    this.tools = tools;
    this.approvals = approvals;
    this.audit = audit;
  }

  attach(stream) {
    this.bus.subscribe(stream, this.name, async (event) => {
      if (this.bus.isCancelled(event.task_id)) return;
      this.audit?.record("worker.start", { task_id: event.task_id, worker: this.name });
      const result = await this.handle(event);
      if (this.bus.isCancelled(event.task_id)) {
        this.audit?.record("worker.cancelled", { task_id: event.task_id, worker: this.name });
        return;
      }
      this.bus.publish(STREAMS.RESULT, {
        task_id: event.task_id,
        worker: this.name,
        result
      });
      this.audit?.record("worker.finish", { task_id: event.task_id, worker: this.name });
    });
    this.bus.publish(STREAMS.LIFECYCLE, { agent_id: this.name, status: "attached", stream });
  }

  costFor(text, model = MODEL_POLICY.SONNET) {
    const inputTokens = estimateTokens(text);
    const outputTokens = Math.ceil(inputTokens * 0.75);
    return {
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_usd: estimateCostUsd({ model, inputTokens, outputTokens })
    };
  }
}
