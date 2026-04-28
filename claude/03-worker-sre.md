# PRD 03 - SRE Worker

## Objetivo

Crear un worker especializado en tareas SRE: triage de incidentes, analisis de pipelines, revision de logs/metricas, busqueda de despliegues recientes, preparacion de postmortems y recomendaciones de remediacion.

## Modelo recomendado

- **Sonnet por defecto** para diagnostico operativo estandar.
- **Opus** para incidentes criticos, baja confianza, alta ambiguedad o planes de remediacion con impacto.

## Herramientas MVP

| Herramienta | Modo |
| --- | --- |
| Datadog APM/Logs | Read-only |
| GitHub | Read-only, draft comment con approval |
| CircleCI | Read-only, rerun con approval |
| Notion runbooks | Read-only |
| Knowledge Graph | Read-only |
| AWS | Read-only inicial |

## Casos de uso MVP

### Triage de incidente

Entrada: "Investiga por que subieron los errores 5xx del servicio billing-api."

El worker debe:

1. Identificar ventana temporal.
2. Consultar Datadog para metricas y logs.
3. Revisar despliegues recientes.
4. Buscar PRs/commits relacionados.
5. Consultar runbooks.
6. Separar hechos, inferencias e hipotesis.
7. Proponer siguientes pasos con nivel de confianza.

### Analisis de pipeline fallido

Entrada: "Revisa por que fallo el build de CircleCI en repo backend."

El worker debe:

1. Consultar pipeline y job fallido.
2. Extraer fragmentos relevantes de logs.
3. Identificar causa probable.
4. Buscar cambios recientes.
5. Proponer fix, owner o siguiente paso.

### Preparacion de postmortem

Debe generar timeline, impacto, causa probable, mitigacion, follow-ups y fuentes.

## Acciones permitidas

| Accion | Modo |
| --- | --- |
| Leer logs | Automatico |
| Leer metricas | Automatico |
| Leer PRs | Automatico |
| Leer pipelines | Automatico |
| Crear borrador de issue | Requiere confirmacion |
| Comentar en Jira/GitHub | Requiere aprobacion |
| Reintentar pipeline | Requiere aprobacion |
| Rollback | Fuera del MVP |
| Modificar infra | Fuera del MVP |

## Formato de salida

```json
{
  "summary": "Resumen ejecutivo",
  "severity_estimate": "low|medium|high|critical",
  "facts": [],
  "hypotheses": [
    {
      "description": "string",
      "confidence": 0.72,
      "supporting_sources": []
    }
  ],
  "recommended_actions": [],
  "requires_human_approval": true,
  "sources": [],
  "missing_information": [],
  "cost": {
    "model": "claude-sonnet",
    "estimated_usd": 0.42
  }
}
```

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| SRE-001 | Consumir tareas desde `task.dispatch.sre-support`. |
| SRE-002 | Consultar Datadog por servicio y ventana temporal. |
| SRE-003 | Consultar GitHub para commits, PRs y owners. |
| SRE-004 | Consultar CircleCI para pipelines y logs. |
| SRE-005 | Consultar runbooks desde Knowledge Graph/Notion. |
| SRE-006 | Generar hipotesis con nivel de confianza. |
| SRE-007 | Separar hechos, inferencias y recomendaciones. |
| SRE-008 | Solicitar aprobacion antes de acciones mutativas. |
| SRE-009 | Publicar resultado en `task.result`. |
| SRE-010 | Registrar coste y tool calls. |

## Criterios de aceptacion

- Diagnostica un pipeline fallido usando logs reales.
- Distingue evidencia de conjetura.
- No ejecuta acciones mutativas sin aprobacion.
- Produce salida estructurada validable.
- Escala a Opus cuando la confianza sea baja o el riesgo alto.

## Prompt para Claude Sonnet

```text
<role>
Actua como ingeniero SRE senior e implementador de agentes.
</role>

<task>
Implementa el SRE Worker segun este PRD. Prioriza read-only tools, salida JSON validable, separacion de hechos e inferencias, y approval workflow para acciones mutativas.
</task>

<constraints>
No inventes datos observacionales. Si faltan logs, metricas o permisos, dilo explicitamente. No propongas rollback automatico en MVP.
</constraints>

<output>
Devuelve modulos, schemas, handlers de tareas, tool interfaces y tests para triage de incidente y pipeline fallido.
</output>
```

