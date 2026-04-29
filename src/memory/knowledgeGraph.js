import { nowIso, uuid } from "../core/ids.js";

function normalize(value) {
  return String(value || "").toLowerCase();
}

function tokenize(value) {
  return normalize(value)
    .split(/[^a-z0-9áéíóúñ_-]+/i)
    .filter((token) => token.length > 2);
}

function overlaps(queryTokens, text) {
  const textValue = normalize(text);
  return queryTokens.filter((token) => textValue.includes(token)).length;
}

export class KnowledgeGraph {
  constructor({ audit } = {}) {
    this.audit = audit;
    this.entities = new Map();
    this.relations = [];
    this.seed();
  }

  seed() {
    const teamPayments = this.addEntity({
      type: "Team",
      name: "team-payments",
      summary: "Owner principal de billing-api y flujos de facturacion.",
      source: { tool: "seed", ref: "teams/team-payments" },
      confidence: 0.9
    });
    const billingApi = this.addEntity({
      type: "Service",
      name: "billing-api",
      summary: "Servicio de facturacion afectado por exportaciones de facturas y errores 5xx.",
      source: { tool: "seed", ref: "services/billing-api" },
      confidence: 0.86
    });
    const runbook = this.addEntity({
      type: "Runbook",
      name: "Runbook billing-api 5xx",
      summary: "Check DB pool, retry queue, deploys recientes y cambios de concurrencia.",
      source: { tool: "notion", ref: "notion://runbooks/billing-5xx" },
      confidence: 0.82
    });
    const acme = this.addEntity({
      type: "Account",
      name: "ACME",
      summary: "Cuenta B2B con tickets recientes sobre exportacion CSV y SSO.",
      source: { tool: "jira", ref: "account:ACME" },
      confidence: 0.78
    });
    const exportTicket = this.addEntity({
      type: "Ticket",
      name: "SUP-1001",
      summary: "Exportacion CSV falla para facturas grandes; severidad alta.",
      source: { tool: "jira", ref: "SUP-1001" },
      confidence: 0.84
    });
    const incident = this.addEntity({
      type: "Incident",
      name: "billing-api 5xx spike",
      summary: "Incidente historico relacionado con saturacion de pool de base de datos tras cambios de concurrencia.",
      valid_from: "2026-04-28T09:55:00.000Z",
      source: { tool: "datadog", ref: "incident/billing-api-5xx" },
      confidence: 0.74
    });

    this.addRelation({
      from: billingApi.id,
      to: teamPayments.id,
      type: "SERVICE_OWNED_BY_TEAM",
      source: { tool: "seed", ref: "ownership/billing-api" }
    });
    this.addRelation({
      from: billingApi.id,
      to: runbook.id,
      type: "INCIDENT_REFERENCES_RUNBOOK",
      source: { tool: "notion", ref: "notion://runbooks/billing-5xx" }
    });
    this.addRelation({
      from: acme.id,
      to: exportTicket.id,
      type: "ACCOUNT_HAS_TICKET",
      source: { tool: "jira", ref: "account:ACME" }
    });
    this.addRelation({
      from: incident.id,
      to: billingApi.id,
      type: "INCIDENT_AFFECTS_SERVICE",
      source: { tool: "datadog", ref: "incident/billing-api-5xx" }
    });
  }

  addEntity({ type, name, summary, source, confidence = 0.5, valid_from, valid_to, metadata = {} }) {
    const entity = {
      id: uuid(),
      type,
      name,
      summary,
      source,
      confidence,
      valid_from: valid_from || nowIso(),
      valid_to: valid_to || null,
      metadata
    };
    this.entities.set(entity.id, entity);
    this.audit?.record("kg.entity.add", { entity_id: entity.id, entity_type: type, name });
    return entity;
  }

  addRelation({ from, to, type, source, confidence = 0.7, valid_from, valid_to }) {
    const relation = {
      id: uuid(),
      from,
      to,
      type,
      source,
      confidence,
      valid_from: valid_from || nowIso(),
      valid_to: valid_to || null
    };
    this.relations.push(relation);
    this.audit?.record("kg.relation.add", { relation_id: relation.id, relation_type: type, from, to });
    return relation;
  }

  search({ query, entity_filters = [], max_results = 8, min_confidence = 0, time_range = null }) {
    const tokens = tokenize(query);
    const filterSet = new Set(entity_filters);
    const results = [...this.entities.values()]
      .filter((entity) => filterSet.size === 0 || filterSet.has(entity.type))
      .filter((entity) => entity.confidence >= min_confidence)
      .filter((entity) => this.isInTimeRange(entity, time_range))
      .map((entity) => {
        const score = overlaps(tokens, `${entity.type} ${entity.name} ${entity.summary}`) + entity.confidence;
        return {
          entity,
          score,
          relations: this.relationsFor(entity.id)
        };
      })
      .filter((item) => item.score > item.entity.confidence)
      .sort((a, b) => b.score - a.score)
      .slice(0, max_results);

    this.audit?.record("kg.search", {
      query,
      result_count: results.length,
      entity_filters
    });

    return {
      query,
      results,
      sources: results.map((item) => item.entity.source)
    };
  }

  isInTimeRange(entity, timeRange) {
    if (!timeRange) return true;
    const from = timeRange.from ? new Date(timeRange.from).getTime() : Number.NEGATIVE_INFINITY;
    const to = timeRange.to ? new Date(timeRange.to).getTime() : Number.POSITIVE_INFINITY;
    const entityFrom = new Date(entity.valid_from).getTime();
    const entityTo = entity.valid_to ? new Date(entity.valid_to).getTime() : Number.POSITIVE_INFINITY;
    return entityFrom <= to && entityTo >= from;
  }

  relationsFor(entityId) {
    return this.relations
      .filter((relation) => relation.from === entityId || relation.to === entityId)
      .map((relation) => ({
        ...relation,
        from_entity: this.entities.get(relation.from)?.name,
        to_entity: this.entities.get(relation.to)?.name
      }));
  }

  snapshot() {
    return {
      entities: [...this.entities.values()],
      relations: this.relations
    };
  }

  load(snapshot = {}) {
    this.entities = new Map();
    for (const entity of snapshot.entities || []) {
      this.entities.set(entity.id, entity);
    }
    this.relations = Array.isArray(snapshot.relations) ? [...snapshot.relations] : [];
  }
}
