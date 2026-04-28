# PRD 08 - UI Interna de Operaciones Agentic

## Objetivo

Crear una interfaz interna para enviar tareas, revisar resultados, aprobar acciones, dar feedback y monitorear comportamiento de agentes.

## Usuarios

- SRE.
- Customer Success.
- Managers.
- Admins.
- Seguridad.
- FinOps.

## Pantallas MVP

### Task Console

Debe permitir:

- Crear tarea.
- Seleccionar dominio.
- Ver estado.
- Ver worker asignado.
- Ver historial.
- Cancelar tarea.

### Result Viewer

Debe mostrar:

- Resumen.
- Hechos.
- Inferencias.
- Recomendaciones.
- Fuentes.
- Coste.
- Modelo usado.
- Tool calls.

### Approval Inbox

Debe mostrar:

- Accion propuesta.
- Riesgo.
- Evidencia.
- Diff o payload.
- Botones aprobar, rechazar y editar.

### Cost Dashboard

Debe mostrar:

- Coste por equipo.
- Coste por worker.
- Coste por modelo.
- Tareas mas caras.
- Alertas de anomalia.

### Admin Console

Debe permitir:

- Configurar budgets.
- Habilitar/deshabilitar workers.
- Ver DLQ.
- Revisar auditoria.
- Gestionar politicas.

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| UI-001 | Crear tareas desde UI. |
| UI-002 | Mostrar estado en tiempo real. |
| UI-003 | Permitir cancelar tarea. |
| UI-004 | Mostrar fuentes y razonamiento resumido. |
| UI-005 | Permitir aprobacion humana. |
| UI-006 | Permitir feedback de calidad. |
| UI-007 | Mostrar coste por tarea. |
| UI-008 | Mostrar errores y DLQ para admins. |

## Criterios de aceptacion

- Un usuario puede lanzar una tarea SRE desde UI.
- Un aprobador puede revisar y aprobar una accion.
- Un admin puede identificar tareas caras.
- Un usuario puede calificar una respuesta.
- La UI deja claro que informacion es hecho, inferencia o recomendacion.

## Prompt para Claude Sonnet

```text
<role>
Actua como product engineer senior especializado en herramientas internas operativas.
</role>

<task>
Diseña e implementa la UI MVP para Task Console, Result Viewer, Approval Inbox, Cost Dashboard y Admin Console.
</task>

<constraints>
Debe ser una herramienta de trabajo densa, clara y rapida. Evita estilo landing page. Prioriza lectura, filtros, estados, aprobaciones y trazabilidad.
</constraints>

<output>
Entrega estructura de componentes, rutas, estados, contratos API y tests de flujos principales.
</output>
```

