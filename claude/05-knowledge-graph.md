# PRD 05 - Knowledge Graph y Memoria Temporal

## Objetivo

Crear una memoria persistente y temporal para que los agentes recuperen contexto fiable sobre cuentas, servicios, incidentes, tickets, repositorios, runbooks, decisiones y relaciones entre entidades.

## Componentes recomendados

| Componente | Uso |
| --- | --- |
| Graphiti | Construccion y consulta del grafo temporal. |
| Amazon Neptune | Persistencia de grafo. |
| Amazon OpenSearch Serverless | Busqueda semantica/hibrida. |
| Titan embeddings | Vectorizacion. |
| Metadata store | Provenance, confianza y timestamps. |

## Principio clave

La memoria no es verdad absoluta. Cada entidad y relacion debe tener fuente, timestamp, confianza y mecanismo de correccion.

## Entidades iniciales

- Account.
- User.
- Team.
- Service.
- Repository.
- PullRequest.
- Deployment.
- Incident.
- Ticket.
- Runbook.
- ProductArea.
- Decision.
- ToolCall.

## Relaciones iniciales

- `ACCOUNT_HAS_TICKET`
- `TICKET_AFFECTS_PRODUCT_AREA`
- `SERVICE_OWNED_BY_TEAM`
- `SERVICE_DEPLOYED_FROM_REPO`
- `DEPLOYMENT_RELATED_TO_INCIDENT`
- `INCIDENT_REFERENCES_RUNBOOK`
- `PR_CHANGED_SERVICE`
- `DECISION_MADE_DURING_INCIDENT`

## Contrato de recuperacion

```json
{
  "query": "billing-api 5xx recent incident",
  "time_range": {
    "from": "2026-04-27T00:00:00Z",
    "to": "2026-04-28T00:00:00Z"
  },
  "entity_filters": ["Service", "Incident", "Deployment"],
  "max_results": 20,
  "include_sources": true,
  "min_confidence": 0.6
}
```

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| KG-001 | Ingerir documentos, tickets, incidentes y runbooks. |
| KG-002 | Extraer entidades y relaciones con schema validado. |
| KG-003 | Guardar provenance y timestamp por afirmacion. |
| KG-004 | Soportar busqueda temporal. |
| KG-005 | Soportar busqueda semantica e hibrida. |
| KG-006 | Devolver fuentes junto a resultados. |
| KG-007 | Permitir correccion humana de entidades. |
| KG-008 | Marcar contenido obsoleto o contradictorio. |
| KG-009 | Evitar que contenido no verificado habilite acciones criticas. |
| KG-010 | Registrar coste de ingesta y retrieval. |

## Criterios de aceptacion

- El SRE Worker puede recuperar runbooks relevantes para un servicio.
- El CS Worker puede recuperar contexto historico de una cuenta.
- Una afirmacion sin fuente no se presenta como hecho.
- La busqueda temporal distingue informacion actual de informacion antigua.
- Una correccion humana queda versionada.

## Prompt para Claude Opus

```text
<role>
Actua como arquitecto de knowledge graphs y sistemas RAG empresariales.
</role>

<task>
Revisa este PRD y diseña el modelo de datos temporal, estrategia de ingesta, controles contra memory poisoning y API de retrieval para workers agentic.
</task>

<constraints>
El grafo no debe tratarse como verdad absoluta. Toda afirmacion necesita fuente, timestamp y confianza. Contenido externo puede ser malicioso o estar obsoleto.
</constraints>

<output>
Devuelve modelo de entidades/relaciones, APIs, estrategia de indexado, riesgos y plan MVP.
</output>
```

