# PRD 04 - Customer Success Worker

## Objetivo

Crear un worker para Customer Success que analice cuentas, resuma tickets, consulte documentacion, prepare respuestas, detecte riesgos y coordine informacion con producto o ingenieria.

## Modelo recomendado

- **Sonnet** para resumen de cuenta, triage de ticket y borradores.
- **Opus** para clientes estrategicos, comunicaciones ejecutivas, situaciones contractuales delicadas o fuentes contradictorias.

## Herramientas MVP

| Herramienta | Modo |
| --- | --- |
| Jira | Read-only, update con approval |
| Notion | Read-only |
| Knowledge Graph | Read-only |
| CRM | Read-only si existe |
| GitHub | Read-only para contexto tecnico |
| MCP interno | Segun permisos |

## Casos de uso MVP

### Resumen de cuenta

Entrada: "Dame contexto de la cuenta Acme antes de la reunion."

Salida esperada:

- Estado de cuenta.
- Tickets abiertos.
- Incidentes recientes.
- Riesgos.
- Oportunidades.
- Proximos pasos.
- Temas sensibles.
- Fuentes.

### Borrador de respuesta a cliente

Entrada: "Prepara respuesta para el cliente sobre el bug de exportacion."

El worker debe:

1. Leer ticket.
2. Buscar bugs relacionados.
3. Consultar estado en Jira.
4. Verificar documentacion.
5. Generar borrador.
6. Marcar informacion incierta.

### Triage de ticket

Debe clasificar tipo de problema, severidad, producto afectado, cuenta, owner probable e informacion faltante.

## Acciones permitidas

| Accion | Modo |
| --- | --- |
| Leer tickets | Automatico con permisos |
| Leer docs | Automatico |
| Generar resumen | Automatico |
| Generar borrador | Automatico |
| Actualizar Jira | Requiere aprobacion |
| Enviar email externo | Fuera del MVP o aprobacion explicita |
| Cambiar estado contractual | Fuera del MVP |

## Formato de salida

```json
{
  "account_summary": "string",
  "open_items": [],
  "risks": [
    {
      "risk": "string",
      "severity": "low|medium|high",
      "evidence": []
    }
  ],
  "draft_response": "string|null",
  "missing_information": [],
  "recommended_next_steps": [],
  "sources": []
}
```

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| CS-001 | Consumir tareas desde `task.dispatch.cs-assistant`. |
| CS-002 | Recuperar informacion de cuenta desde KG/CRM. |
| CS-003 | Leer tickets Jira relacionados. |
| CS-004 | Consultar documentacion de producto. |
| CS-005 | Generar resumen ejecutivo. |
| CS-006 | Generar borrador de comunicacion. |
| CS-007 | Detectar riesgos de churn o escalacion. |
| CS-008 | Distinguir hechos confirmados de supuestos. |
| CS-009 | Requerir aprobacion para comunicaciones externas. |
| CS-010 | Publicar resultados en `task.result`. |

## Criterios de aceptacion

- Dada una cuenta, produce resumen util con fuentes.
- Dado un ticket, genera clasificacion y owner probable.
- No inventa fechas, compromisos ni estado de producto.
- Toda respuesta externa queda como borrador.
- Fuentes contradictorias se marcan explicitamente.

## Prompt para Claude Sonnet

```text
<role>
Actua como ingeniero de producto y Customer Success Ops.
</role>

<task>
Implementa el CS Worker segun este PRD. Debe producir resumenes y borradores con fuentes, incertidumbre explicita y controles de aprobacion.
</task>

<constraints>
No inventes compromisos con clientes. No envies comunicaciones externas. Separa hechos, riesgos, supuestos y proximos pasos.
</constraints>

<output>
Entrega schemas, handlers, tool interfaces y tests para resumen de cuenta, triage de ticket y borrador de respuesta.
</output>
```

