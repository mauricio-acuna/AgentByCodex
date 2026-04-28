# Arquitectura MVP

## Modulos

- `src/dispatcher`: clasifica intencion, riesgo, dominio, worker y presupuesto.
- `src/bus`: event bus en memoria con streams equivalentes a Redis Streams.
- `src/workers`: workers SRE y Customer Success.
- `src/tools`: conectores mock read-only para Datadog, GitHub, CircleCI, Jira y Notion.
- `src/memory`: Knowledge Graph local con entidades, relaciones, fuentes, confianza y busqueda temporal simple.
- `src/security`: policy engine, permisos por rol, deteccion de prompt injection y redaccion basica.
- `src/approvals`: workflow de aprobacion humana.
- `src/core`: errores, costes, budget guard, ids, auditoria y validacion.
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
10. Aplicar presupuesto de tool calls y coste.
11. Registrar auditoria y coste.
12. Operar el flujo desde una UI interna simple.

## DLQ y reproceso

Los fallos de permisos, presupuesto o worker se publican en `task.dispatch.dlq`.
La API permite inspeccionar y reprocesar eventos:

```http
GET /dlq
POST /dlq/{event_id}/replay
```

El reproceso vuelve a publicar el evento original en el stream donde fallo.

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
