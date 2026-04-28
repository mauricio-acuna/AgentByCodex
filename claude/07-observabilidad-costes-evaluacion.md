# PRD 07 - Observabilidad, Costes y Evaluacion

## Objetivo

Medir funcionamiento, calidad, coste, seguridad y confiabilidad de los agentes desde el primer dia.

## Metricas tecnicas

- Latencia por tarea.
- Tiempo en cola.
- Tasa de exito.
- Tasa de error.
- Timeouts.
- Retries.
- Uso de DLQ.
- Tool calls por tarea.
- Tokens de entrada/salida.
- Coste estimado.
- Modelo usado.

## Metricas de calidad

- Utilidad percibida.
- Tasa de aceptacion de recomendaciones.
- Tasa de correccion humana.
- Groundedness.
- Precision de routing.
- Escalaciones innecesarias.
- Hallucination rate.
- Actionability.

## Metricas de negocio

- Minutos ahorrados.
- Tickets resueltos o acelerados.
- Reduccion de tiempo de triage.
- Coste por tarea.
- Coste por equipo.
- Coste por cliente.
- Volumen de aprobaciones.

## Evaluacion automatica

```json
{
  "task_id": "uuid",
  "groundedness": 0.0,
  "completeness": 0.0,
  "safety": 0.0,
  "actionability": 0.0,
  "cost_efficiency": 0.0,
  "requires_review": true,
  "review_reasons": []
}
```

## Politica de modelos y costes

| Tarea | Modelo |
| --- | --- |
| Clasificacion simple | Modelo pequeno o Sonnet |
| Extraccion estructurada | Sonnet |
| Resumen de ticket | Sonnet |
| Triage tecnico estandar | Sonnet |
| Incidente ambiguo | Sonnet + fallback Opus |
| Plan critico de remediacion | Opus |
| Comunicacion ejecutiva delicada | Opus |
| Evaluacion critica | Opus o juez separado |

## Presupuestos

```json
{
  "team": "sre",
  "monthly_budget_usd": 2000,
  "max_task_cost_usd": 5,
  "opus_requires_approval_above_usd": 1.5,
  "max_tool_calls_per_task": 20,
  "max_runtime_seconds": 600,
  "mode": "balanced"
}
```

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| OBS-001 | Registrar trace completo por tarea. |
| OBS-002 | Enviar metricas a Datadog u observabilidad equivalente. |
| OBS-003 | Registrar coste por modelo y tool call. |
| OBS-004 | Evaluar outputs automaticamente. |
| OBS-005 | Permitir feedback humano. |
| OBS-006 | Generar dashboards por equipo. |
| OBS-007 | Alertar por coste anomalo. |
| OBS-008 | Alertar por errores, retries o DLQ. |
| OBS-009 | Guardar muestras para evaluacion offline. |
| OBS-010 | Permitir replay controlado de tareas. |

## Criterios de aceptacion

- Un admin puede ver coste por equipo y por tarea.
- Se puede reconstruir que hizo un agente paso a paso.
- El sistema alerta si un worker entra en loop.
- Se puede comparar Sonnet vs Opus por coste/calidad.
- Una tarea que excede presupuesto se cancela de forma controlada.

## Prompt para Claude Sonnet

```text
<role>
Actua como ingeniero de observabilidad y FinOps para sistemas de IA.
</role>

<task>
Diseña la instrumentacion de tareas agentic: trazas, metricas, logs, coste, evaluacion automatica, dashboards y alertas.
</task>

<constraints>
Cada tarea debe registrar modelo, tokens, coste, tool calls, latencia y resultado. No guardes secretos ni datos sensibles innecesarios en logs.
</constraints>

<output>
Entrega schema de eventos, lista de metricas, dashboards MVP, alertas y tests de instrumentacion.
</output>
```

