import { BaseWorker } from "./baseWorker.js";

function extractAccount(prompt) {
  const match = prompt.match(/cuenta\s+([A-Za-z0-9_-]+)/i) || prompt.match(/account\s+([A-Za-z0-9_-]+)/i);
  return (match?.[1] || "ACME").toUpperCase();
}

export class CsWorker extends BaseWorker {
  async handle(event) {
    const prompt = event.payload.prompt;
    const account = extractAccount(prompt);
    const context = { task_id: event.task_id, requested_by: event.requested_by };
    const [tickets, docs, memory] = await Promise.all([
      this.tools.call("jiraGetAccountTickets", { account }, context),
      this.tools.call("notionSearchDocs", { query: prompt }, context),
      this.tools.call(
        "knowledgeSearch",
        {
          query: `${account} ticket exportacion account risk`,
          entity_filters: ["Account", "Ticket", "ProductArea"],
          max_results: 5,
          min_confidence: 0.6
        },
        context
      )
    ]);

    const highSeverity = tickets.tickets.filter((ticket) => ticket.severity === "high");
    const risks = highSeverity.map((ticket) => ({
      risk: `Open high-severity ticket ${ticket.key}: ${ticket.title}`,
      severity: "high",
      evidence: tickets.sources
    }));

    const draft = /respuesta|response|cliente|customer/i.test(prompt)
      ? "Gracias por el reporte. El equipo ya esta revisando el caso relacionado con exportaciones grandes. Confirmaremos estado y proximos pasos cuando tengamos validacion de ingenieria."
      : null;

    return {
      account_summary: `${account} has ${tickets.tickets.length} open tracked items; ${highSeverity.length} require close follow-up. Memory returned ${memory.results.length} related records.`,
      open_items: tickets.tickets,
      risks,
      draft_response: draft,
      missing_information: ["CRM health score is not connected in MVP.", "External email sending is disabled."],
      recommended_next_steps: [
        "Confirm current Jira owner for high-severity items.",
        "Use the draft only after human review.",
        "Escalate contradictory product status to Product/Engineering."
      ],
      sources: [...tickets.sources, ...docs.sources, ...memory.sources],
      memory_context: memory.results,
      cost: this.costFor(event.payload.prompt)
    };
  }
}
