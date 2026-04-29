# Arquitectura MVP

## Modulos

- `src/dispatcher`: clasifica intencion, riesgo, dominio, worker y presupuesto.
- `src/bus`: event bus en memoria con streams equivalentes a Redis Streams.
- `src/workers`: workers SRE y Customer Success.
- `src/tools`: conectores mock read-only para Datadog, GitHub, CircleCI, Jira y Notion.
- `src/memory`: Knowledge Graph local con entidades, relaciones, fuentes, confianza y busqueda temporal simple.
- `src/security`: policy engine, permisos por rol, deteccion de prompt injection y redaccion basica.
- `src/security/securityReview.js`: revision de seguridad por tarea usando auditoria, approvals y ejecuciones.
- `src/approvals`: workflow de aprobacion humana.
- `src/actions`: ejecucion controlada y auditable de acciones aprobadas.
- `src/core`: errores, costes, budget guard, ids, auditoria y validacion.
- `src/persistence`: snapshots JSON locales de estado operativo.
- `src/server.js`: API HTTP nativa.
- `public/`: UI interna para consola de tareas, resultados, approvals, knowledge, metrics, DLQ y audit trail.

## Streams implementados

- `task.dispatch`
- `task.dispatch.sre-support`
- `task.dispatch.cs-assistant`
- `task.result`
- `task.dispatch.dlq`
- `agent.lifecycle`
- `signal.health`
- `signal.cancel`

## Estado actual

Este MVP demuestra los contratos y flujos principales:

1. Crear tarea.
2. Clasificar dominio/riesgo.
3. Publicar en stream.
4. Consumir con worker especializado.
5. Consultar herramientas read-only.
6. Recuperar contexto del Knowledge Graph.
7. Detectar prompt injection en datos no confiables.
8. Generar output estructurado.
9. Crear approval request para accion sensible.
10. Ejecutar acciones L2/L3 solo con approval aprobado.
11. Redactar secretos/PII del output final.
12. Generar revision de seguridad por tarea.
13. Aplicar presupuesto de tool calls y coste.
14. Registrar auditoria y coste.
15. Operar el flujo desde una UI interna simple.

## DLQ y reproceso

Los fallos de permisos, presupuesto o worker se publican en `task.dispatch.dlq`.
La API permite inspeccionar y reprocesar eventos:

```http
GET /dlq
POST /dlq/{event_id}/replay
```

El reproceso vuelve a publicar el evento original en el stream donde fallo.

## Persistencia local

El servidor puede guardar y cargar snapshots JSON con:

```http
POST /state/save
POST /state/load
```

Por defecto usa `data/state.json`, ignorado por Git. El snapshot incluye tareas,
auditoria, approvals, ejecuciones, Knowledge Graph, presupuestos y streams.

## Contract Test

La suite incluye un worker dummy que valida el contrato minimo:

```text
Dispatcher -> task.dispatch.sre-support -> Worker -> task.result -> completed
```

Tambien valida contratos negativos:

```text
Worker error -> task.dispatch.dlq -> task failed
signal.cancel -> worker result ignored -> task cancelled
```

## Siguiente paso natural

Sustituir `InMemoryStreamBus` por un adaptador Redis real manteniendo la misma interfaz:

```js
publish(stream, payload)
subscribe(stream, consumerName, handler)
cancelTask(taskId, reason)
isCancelled(taskId)
list(stream)
```

Despues, sustituir `ToolRegistry` mock por conectores reales detras de los mismos nombres y risk levels.
