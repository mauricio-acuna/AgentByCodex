# PRD 01 - Master Dispatcher

## Objetivo

Desarrollar el servicio central que recibe solicitudes, clasifica intencion, enruta tareas a workers, gestiona contexto, aplica politicas de seguridad y supervisa el ciclo de vida de cada tarea.

## Modelo recomendado

- **Sonnet**: routing simple, clasificacion, extraccion de entidades, resumen de contexto.
- **Opus**: routing ambiguo, arbitraje entre workers, planes multi-step, evaluacion de riesgo alto.

Politica: `sonnet-first-opus-escalation`.

## Entradas

El dispatcher debe aceptar tareas desde:

- API REST.
- UI interna.
- Slack/chat corporativo, si aplica.
- Webhooks de Jira, GitHub, Datadog o CircleCI.
- Eventos de Redis Streams.

## Responsabilidades

1. Crear `task_id`.
2. Autenticar usuario o sistema origen.
3. Clasificar dominio, intencion, urgencia y riesgo.
4. Determinar worker destino.
5. Recuperar contexto minimo necesario.
6. Aplicar politicas de permisos y coste.
7. Publicar evento en stream correspondiente.
8. Escuchar resultados.
9. Normalizar respuesta final.
10. Registrar auditoria completa.

## Contrato de clasificacion

```json
{
  "task_id": "uuid",
  "task_type": "incident_triage",
  "domain": "sre",
  "risk_level": "low|medium|high|critical",
  "urgency": "low|normal|high|urgent",
  "worker": "sre-worker",
  "requires_human_approval": true,
  "model_policy": "sonnet-first-opus-escalation",
  "context_needed": ["datadog", "github", "recent_deploys"],
  "budget": {
    "max_usd": 5,
    "max_runtime_seconds": 600,
    "max_tool_calls": 20
  }
}
```

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| MD-001 | Exponer API para crear tareas. |
| MD-002 | Asignar cada tarea a un worker o devolver error explicable. |
| MD-003 | Registrar decisiones de routing y modelo elegido. |
| MD-004 | Soportar fallback de Sonnet a Opus. |
| MD-005 | Bloquear acciones no autorizadas antes de tool calls. |
| MD-006 | Soportar cancelacion de tareas. |
| MD-007 | Generar resumen final con fuentes y acciones tomadas. |
| MD-008 | Aplicar limites de coste por tarea, usuario y equipo. |
| MD-009 | Enviar tareas fallidas no recuperables a DLQ. |
| MD-010 | Mantener estado consultable de cada tarea. |

## Requisitos no funcionales

| Categoria | Requisito |
| --- | --- |
| Latencia | Routing simple menor a 2 segundos. |
| Disponibilidad | 99.5% para MVP. |
| Seguridad | Autenticacion y autorizacion obligatorias. |
| Observabilidad | Logs estructurados, traces y metricas. |
| Escalabilidad | Workers desacoplados mediante Redis Streams. |
| Auditoria | Retencion minima de eventos por 90 dias. |

## Criterios de aceptacion

- Una solicitud SRE llega a `task.dispatch.sre-support` con contexto correcto.
- Una solicitud CS llega a `task.dispatch.cs-assistant`.
- Una tarea ambigua pide aclaracion o escala a Opus.
- Una accion sensible crea approval request.
- Toda tarea registra modelo, tokens, tool calls, coste y fuentes.
- Una tarea en ejecucion puede cancelarse mediante `signal.cancel`.

## Prompt para Claude Sonnet

```text
<role>
Actua como ingeniero backend senior.
</role>

<context>
Implementa el Master Dispatcher segun este PRD. Usa schemas estrictos, outputs estructurados y separa routing, policy checks, cost tracking y publicacion de eventos.
</context>

<task>
Descompone la implementacion en modulos y genera el codigo inicial con tests unitarios para clasificacion, seleccion de worker, presupuesto y publicacion de evento.
</task>

<constraints>
No ejecutes acciones mutativas desde el dispatcher. El dispatcher solo orquesta, valida, audita y publica eventos. Sonnet es el modelo por defecto; Opus se invoca solo por politica.
</constraints>

<output>
Devuelve una propuesta de archivos, interfaces, schemas y tests. Si escribes codigo, prioriza claridad y contratos validables.
</output>
```

