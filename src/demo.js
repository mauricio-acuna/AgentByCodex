import { createApp } from "./app.js";

const app = createApp();

const sreTask = app.dispatcher.createTask({
  prompt: "Investiga por que subieron los errores 5xx del servicio billing-api",
  requested_by: { id: "ana", team: "sre", roles: ["sre"] },
  domain_hint: "sre"
});

const csTask = app.dispatcher.createTask({
  prompt: "Dame contexto de la cuenta Acme antes de la reunion y prepara respuesta para el cliente sobre exportacion",
  requested_by: { id: "lucia", team: "cs", roles: ["cs"] },
  domain_hint: "customer_success"
});

setTimeout(() => {
  console.log(JSON.stringify({
    sre: app.dispatcher.getTask(sreTask.task_id),
    cs: app.dispatcher.getTask(csTask.task_id),
    approvals: app.approvals.list(),
    audit_events: app.audit.list().length
  }, null, 2));
}, 0);

