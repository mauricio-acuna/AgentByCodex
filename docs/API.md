# Agentic Operations Platform - API

MVP local sin dependencias externas. Usa HTTP nativo de Node y un bus en memoria compatible con los contratos de los PRDs.

## Ejecutar

```powershell
npm.cmd run start
```

Si PowerShell bloquea `npm.ps1`, usa siempre `npm.cmd`.

Servidor por defecto:

```text
http://localhost:8080
```

UI:

```text
GET /
```

## Health

```http
GET /health
```

## Crear tarea

```http
POST /tasks
content-type: application/json
```

```json
{
  "prompt": "Investiga por que subieron los errores 5xx del servicio billing-api",
  "domain_hint": "sre",
  "requested_by": {
    "id": "ana",
    "team": "sre",
    "roles": ["sre"]
  }
}
```

Roles MVP:

- `requester`: lectura baja sensibilidad.
- `sre`: lectura SRE sensible.
- `cs`: lectura CS sensible.
- `admin`: permisos ampliados para approvals y acciones futuras.

## Consultar tarea

```http
GET /tasks/{task_id}
```

## Listar approvals

```http
GET /approvals
GET /approvals?status=pending
```

## Decidir approval

```http
POST /approvals/{approval_id}/decision
content-type: application/json
```

```json
{
  "decision": "approved",
  "decidedBy": {
    "id": "oncall",
    "roles": ["admin"]
  },
  "comment": "Aprobado para crear borrador interno."
}
```

## Ejecutar approval aprobado

```http
POST /approvals/{approval_id}/execute
content-type: application/json
```

```json
{
  "actor": {
    "id": "oncall",
    "roles": ["admin"]
  }
}
```

El MVP ejecuta acciones mutativas en modo simulado y auditable. Acciones L2/L3 requieren approval aprobado. Acciones L4 quedan bloqueadas.

## Listar ejecuciones

```http
GET /actions
GET /actions?task_id={task_id}
```

## Auditoria

```http
GET /audit
GET /tasks/{task_id}/audit
```

## Revision de seguridad por tarea

```http
GET /tasks/{task_id}/security
```

Devuelve hallazgos como prompt injection, output redaction, permisos denegados, acciones bloqueadas, presupuesto excedido y approvals pendientes.

## Knowledge Graph

Snapshot completo:

```http
GET /knowledge
```

Busqueda:

```http
GET /knowledge?q=billing-api%205xx%20runbook&type=Service&type=Runbook&limit=8&min_confidence=0.6
```

## Metrics

```http
GET /metrics
```

## Dead Letter Queue

Listar eventos fallidos:

```http
GET /dlq
```

Reprocesar un evento:

```http
POST /dlq/{event_id}/replay
```

## Demo

```powershell
npm.cmd run demo
```
