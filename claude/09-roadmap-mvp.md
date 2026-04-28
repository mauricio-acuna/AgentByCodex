# PRD 09 - Roadmap MVP

## Estrategia

No construir toda la plataforma de una vez. Validar primero si dos workers read-heavy reducen tiempo real de trabajo sin comprometer seguridad ni costes.

## Fase 0 - Diseño tecnico y seguridad

Duracion sugerida: 2-3 semanas.

Entregables:

- Arquitectura final.
- Taxonomia de tareas.
- Matriz de permisos.
- Schemas de eventos y outputs.
- Politica de seleccion de modelos.
- Politica de costes.
- Definicion de acciones por nivel L0-L4.

## Fase 1 - Plataforma base

Duracion sugerida: 4-6 semanas.

Entregables:

- Master Dispatcher basico.
- Redis Streams.
- Task schema.
- Worker SDK.
- Logging y tracing.
- Cost tracking.
- Health checks.
- DLQ.

## Fase 2 - SRE Worker MVP

Duracion sugerida: 4-6 semanas.

Entregables:

- Datadog read-only.
- GitHub read-only.
- CircleCI read-only.
- Diagnostico de pipeline.
- Triage basico de incidente.
- Output estructurado.
- Approval workflow para acciones.

## Fase 3 - CS Worker MVP

Duracion sugerida: 4-6 semanas.

Entregables:

- Jira read-only.
- Notion read-only.
- Resumen de cuenta.
- Triage de ticket.
- Borrador de respuesta.
- Fuentes y provenance.

## Fase 4 - Knowledge Graph limitado

Duracion sugerida: 6-8 semanas.

Entregables:

- Ingesta inicial.
- Modelo de entidades.
- Busqueda semantica.
- Busqueda temporal.
- API de retrieval.
- Correccion humana.

## Fase 5 - Observabilidad y evaluacion

Duracion sugerida: 3-5 semanas.

Entregables:

- Dashboards.
- Evaluacion automatica.
- Feedback humano.
- Alertas de coste.
- Replay de tareas.
- Comparacion Sonnet vs Opus.

## Fase 6 - Expansion controlada

Entregables:

- Security Worker.
- Data Analyst Worker.
- Mas conectores.
- Automatizaciones aprobadas.
- Optimizacion de costes.
- Hardening de seguridad.

## MVP minimo recomendado

1. Master Dispatcher.
2. Redis Streams.
3. SRE Worker con GitHub + Datadog + CircleCI read-only.
4. CS Worker con Jira + Notion read-only.
5. Cost tracking.
6. Approval workflow basico.
7. Knowledge Graph limitado a documentos, tickets e incidentes.
8. UI simple de tareas y resultados.

## Metricas de exito MVP

| Metrica | Objetivo inicial |
| --- | --- |
| Reduccion de tiempo de triage SRE | 30% |
| Reduccion de tiempo de resumen CS | 40% |
| Outputs con fuentes | 95% |
| Acciones mutativas sin approval | 0 |
| Tareas que exceden presupuesto sin corte | 0 |
| Uso de Opus sobre total de llamadas | Menor a 20% |
| Feedback positivo de usuarios piloto | Mayor a 70% |

## Prompt para Claude Opus

```text
<role>
Actua como CTO pragmatica/o revisando un roadmap MVP de plataforma agentic.
</role>

<task>
Evalua si este roadmap minimiza riesgo y maximiza aprendizaje. Propone recortes, dependencias criticas y decisiones que deben tomarse antes de invertir en fases posteriores.
</task>

<constraints>
El objetivo no es demostrar tecnologia, sino validar ahorro operativo medible con seguridad y coste controlado.
</constraints>

<output>
Devuelve una version revisada del roadmap con riesgos, dependencias, hitos de decision go/no-go y metricas de exito.
</output>
```

