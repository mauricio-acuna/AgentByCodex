# PRD 02 - Event Bus con Redis Streams

## Objetivo

Implementar un bus de eventos confiable con Redis Streams para coordinar tareas, resultados, vida de agentes, cancelaciones, health signals y dead-letter queues.

## Streams MVP

| Stream | Uso |
| --- | --- |
| `task.dispatch` | Entrada general o fallback. |
| `task.dispatch.sre-support` | Tareas para SRE Worker. |
| `task.dispatch.cs-assistant` | Tareas para CS Worker. |
| `task.result` | Resultados normalizados de workers. |
| `task.dispatch.dlq` | Tareas fallidas no recuperables. |
| `agent.lifecycle` | Eventos de arranque, parada, version y estado. |
| `signal.health` | Heartbeats y health checks. |
| `signal.cancel` | Cancelacion de tareas. |

## Contrato de evento de tarea

```json
{
  "event_id": "uuid",
  "task_id": "uuid",
  "created_at": "2026-04-28T10:00:00Z",
  "source": "api|ui|webhook|agent",
  "requested_by": {
    "type": "user|system",
    "id": "string",
    "team": "sre"
  },
  "domain": "sre",
  "task_type": "incident_triage",
  "risk_level": "medium",
  "payload": {},
  "context_refs": [],
  "budget": {
    "max_usd": 5,
    "max_runtime_seconds": 600,
    "max_tool_calls": 20
  },
  "approval_required": false,
  "trace_id": "uuid"
}
```

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| BUS-001 | Publicar tareas con schema validado. |
| BUS-002 | Usar consumer groups por worker. |
| BUS-003 | Soportar retries con limite configurable. |
| BUS-004 | Enviar fallos no recuperables a DLQ. |
| BUS-005 | Publicar resultados en `task.result`. |
| BUS-006 | Soportar cancelacion por `task_id`. |
| BUS-007 | Emitir heartbeat periodico de cada worker. |
| BUS-008 | Registrar latencia de cola y procesamiento. |
| BUS-009 | Evitar payloads gigantes; usar referencias cuando aplique. |
| BUS-010 | Garantizar idempotencia por `task_id` y `event_id`. |

## Semantica de errores

| Tipo | Accion |
| --- | --- |
| Error temporal de herramienta | Retry con backoff. |
| Timeout | Retry si queda presupuesto. |
| Output invalido | Reintento limitado y evaluacion. |
| Falta de permisos | Error final auditable. |
| Prompt injection sospechoso | Bloqueo o sanitizacion segun politica. |
| Presupuesto excedido | Cancelacion controlada. |

## Criterios de aceptacion

- Un worker puede consumir tareas de su stream sin bloquear a otros workers.
- Una tarea fallida llega a DLQ con causa y trazas.
- El dispatcher puede cancelar una tarea en ejecucion.
- El sistema mide tiempo en cola, tiempo de procesamiento y retries.
- La re-publicacion accidental de un evento no ejecuta dos veces una accion mutativa.

## Prompt para Claude Sonnet

```text
<role>
Actua como ingeniero de plataforma especializado en sistemas event-driven.
</role>

<task>
Disena e implementa la capa Redis Streams para esta plataforma, incluyendo schemas, consumer groups, retries, DLQ, cancelacion e idempotencia.
</task>

<constraints>
Los eventos deben ser pequenos, versionados y validables. No guardes secretos en Redis. Las acciones mutativas deben ser idempotentes y requerir approval cuando aplique.
</constraints>

<output>
Entrega interfaces, contratos JSON, pseudocodigo de consumidores y tests de comportamiento para retries, DLQ y cancelacion.
</output>
```

