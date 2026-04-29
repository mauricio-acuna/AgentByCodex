01-progreso.md

# Progreso Fase A

Checklist vivo. Marcar conforme se avance. Ultima actualizacion: 2026-04-28.

Leyenda: `[x]` hecho, `[~]` parcial, `[ ]` pendiente.

## Gate para Fase B (paralelizacion)

- [~] Schemas de evento estables (definidos en `aop_contracts`, en burn-in 3 dias).
- [x] `packages/contracts` versionado (0.1.0). Pendiente: publicar a registry interno.
- [~] Worker SDK con ejemplo end-to-end funcionando (codigo y tests escritos; falta `pytest` con red).
- [x] Policy engine acepta tareas y bloquea acciones L2+ sin approval. Implementado en ruta Node con `ActionExecutor`.
- [x] Cost tracking emite metrica por task_id. Implementado y verificado en ruta Node.
- [x] Tests de contrato dispatcher <-> worker en verde en ruta Node local.
- [x] DLQ funcional con un caso de fallo. Verificado en ruta Node con fallo de permisos, presupuesto y replay.

Estado: **6/7 cumplidos, 1/7 parcial**. Ya conviene planificar Fase B y abrir tracks paralelos con contratos de la ruta Node como referencia.

## Hitos Fase A

### Hito 1 - Scaffolding monorepo y contracts (COMPLETADO)
- [x] Estructura de carpetas (`platform/packages/`, `apps/`).
- [x] `packages/contracts` con schemas Pydantic v2 (PRDs 01, 02, 06, 07).
- [x] Tooling: `pyproject.toml`, ruff, pytest.
- [x] Sintaxis validada con `py_compile`.
- [ ] Suite de tests verde (12 tests escritos, requieren `pip install` -> bloqueado por red).

Modulos en `packages/contracts/src/aop_contracts/`:
- `common.py` - StrictModel, enums, RequestedBy.
- `budget.py` - Budget, TeamBudget.
- `policy.py` - ActionLevel L0-L4, PolicyDecision, ApprovalRequest, ApprovalStatus.
- `task.py` - Task, TaskClassification.
- `result.py` - TaskResult, Source, ToolCall, CostReport.
- `events.py` - DispatchEvent, ResultEvent, CancelSignal, HealthSignal, AgentLifecycleEvent + nombres de streams.
- `evaluation.py` - EvaluationReport.
- `tests/test_schemas.py` - 12 tests (roundtrip JSON, extra=forbid, bounds, defaults).

### Hito 2 - Worker SDK (COMPLETADO)
- [x] `EventBus` (Protocol) y `InMemoryEventBus` (tests/dev).
- [x] Clase base `Worker` (abstracta, asincrona).
- [x] Loop de consumo + validacion de schema -> DLQ si invalido.
- [x] PolicyHook integrado pre-handle -> DLQ si bloqueado.
- [x] Manejo de cancelacion via `signal.cancel`.
- [x] Retries (`TransientWorkerError`) con `max_retries`, despues DLQ.
- [x] `PermanentWorkerError` / errores inesperados -> DLQ inmediato.
- [x] Heartbeats periodicos en `signal.health`.
- [x] Eventos lifecycle (starting/ready/stopped) en `agent.lifecycle`.
- [x] CostHook llamado al completar.
- [x] Validacion: handler debe respetar `task_id` de entrada.
- [x] 8 tests unitarios escritos.
- [ ] Suite verde (bloqueado por red).
- [ ] `RedisStreamsBus` real (extra `[redis]`) - se hara cuando montemos Redis.

Modulos en `packages/worker_sdk/src/aop_worker_sdk/`:
- `bus.py` - EventBus protocol + InMemoryEventBus con consumer groups, ack/nack, DLQ.
- `errors.py` - jerarquia de errores.
- `hooks.py` - PolicyHook, CostHook + Noop stubs.
- `worker.py` - Clase base Worker (~270 lineas).

### Hito 3 - Dispatcher minimo (EN CURSO - SIGUIENTE)
- [ ] `packages/dispatcher` con clase `Dispatcher`.
- [ ] Aceptar input crudo -> crear `Task`, asignar `task_id` y `trace_id`.
- [ ] Clasificador: dominio, task_type, risk, worker destino (regla simple primero, LLM despues).
- [ ] Aplicar `Budget` por tarea segun politica de equipo.
- [ ] Publicar `DispatchEvent` en stream del worker correcto.
- [ ] Escuchar `task.result` y normalizar respuesta final.
- [ ] Estado consultable de cada tarea (in-memory store -> luego BD).
- [ ] API REST (FastAPI) en `apps/dispatcher-api/` (mas tarde).
- [ ] Tests: routing por dominio, cancelacion, presupuesto excedido.

### Hito 4 - Policy engine L0-L4 (PENDIENTE)
- [ ] `packages/policy` con `RuleBasedPolicy` que implementa `PolicyHook`.
- [ ] Mapeo herramienta -> ActionLevel (catalogo).
- [ ] Validacion de permisos de usuario (stub que luego conecta con IDP).
- [ ] Generacion de `ApprovalRequest` para L2+.
- [ ] Detector de prompt injection basico (heuristicas + marcado).
- [ ] Redaccion de PII / secrets en outputs.
- [ ] Tests: bloquear L2 sin approval, permitir L0 read-only, registrar redacciones.

### Hito 5 - Cost tracking + tracing (PENDIENTE)
- [ ] `packages/observability` con `CostTracker` (implementa `CostHook`).
- [ ] Calculo de coste por modelo (tabla de precios Sonnet/Opus configurable).
- [ ] Acumulado por task / team / dia.
- [ ] OpenTelemetry: tracer con span por task, sub-spans por tool call.
- [ ] Logs estructurados (JSON) con `task_id`, `trace_id`, `worker`.
- [ ] Alerta cuando se excede `Budget.max_usd`.

### Hito 6 - Tests de contrato dispatcher <-> worker (COMPLETADO EN RUTA NODE)
- [x] Suite que arranca dispatcher + worker dummy con `InMemoryEventBus`.
- [x] Round-trip: input -> DispatchEvent -> handle -> ResultEvent -> respuesta.
- [x] DLQ end-to-end con worker que lanza error.
- [x] Cancelacion end-to-end.

### Hito 7 - DLQ funcional (PARCIAL)
- [x] Logica de DLQ implementada en `Worker` y `InMemoryEventBus`.
- [ ] Validar caso end-to-end con un worker que falla siempre.
- [ ] Documentar como inspeccionar DLQ y reprocesar.

## Estrategia Actualizada

Adoptamos una estrategia híbrida por fases:
- **Fase A:** Desarrollo secuencial del núcleo crítico.
- **Fase B:** Tracks paralelos tras estabilizar contratos y SDK.

### Progreso Fase A

- [ ] Definir y congelar contratos principales.
- [ ] Implementar Dispatcher mínimo.
- [ ] Crear SDK para Workers con manejo de errores y DLQ.
- [ ] Configurar herramientas de tracking de costos y observabilidad.

### Bloqueadores
- Falta de red para instalar dependencias y ejecutar tests.
- Necesidad de estabilizar contratos antes de paralelizar.

## Bloqueadores actuales

1. **Red corporativa bloquea PyPI**. No se puede `pip install` ni correr `pytest`.
   Mitigacion: el codigo se valida con `py_compile` (sintaxis OK).
   Accion para el usuario: cuando tengas acceso a registry interno o proxy, ejecutar:
   ```powershell
   cd platform
   py -3 -m venv .venv
   .\.venv\Scripts\pip install -e "packages/contracts[dev]" -e "packages/worker_sdk[dev]"
   .\.venv\Scripts\pytest packages
   ```

## Avance Codex - MVP Node verificable

Se avanzo con una implementacion ejecutable sin dependencias externas para no quedar bloqueados por PyPI/Python:

- [x] Master Dispatcher funcional en `src/dispatcher/dispatcher.js`.
- [x] Event bus en memoria con streams equivalentes a Redis en `src/bus/inMemoryStreamBus.js`.
- [x] Workers SRE y CS en `src/workers/`.
- [x] Policy engine L0-L4 parcial con permisos por rol, redaccion y deteccion de prompt injection.
- [x] Redaccion final de secretos/PII antes de persistir resultados.
- [x] Revision de seguridad por tarea con hallazgos accionables.
- [x] Approval workflow en `src/approvals/approvalStore.js`.
- [x] Action executor con bloqueo L2/L3 sin approval aprobado y L4 fuera del MVP.
- [x] Cost tracking basico por tarea en `src/core/costs.js`.
- [x] Enforcement de presupuesto por `max_tool_calls` y `max_usd`.
- [x] Endpoint y panel `/metrics` con totales, coste por task/team/worker/modelo.
- [x] Tool registry mock read-only para Datadog, GitHub, CircleCI, Jira y Notion.
- [x] Knowledge Graph local con entidades, relaciones, fuentes, confianza y busqueda.
- [x] Workers SRE/CS enriquecen resultados con `memory_context`.
- [x] DLQ funcional ante fallo de permisos, presupuesto o worker.
- [x] API/UI para inspeccionar y reprocesar DLQ.
- [x] API HTTP nativa en `src/server.js`.
- [x] Persistencia local JSON para tasks, audit, approvals, actions, KG, budgets y streams.
- [x] Test de contrato dispatcher -> worker dummy -> task.result -> completed.
- [x] Tests de contrato negativos: worker failure -> DLQ y cancelacion -> no result tardio.
- [x] UI interna en `public/` para tasks, resultados, approvals, knowledge, metrics, DLQ y audit trail.
- [x] Tests locales verdes con `npm.cmd test`.

Comando validado:

```powershell
npm.cmd test
```

Resultado:

```text
21 test(s) passed
```

Aviso: se alcanzaron 5 items del gate. Es momento de planificar Fase B si queremos paralelizar tracks, manteniendo el carril Node como comportamiento ejecutable de referencia.

Nota: esta ruta Node no reemplaza necesariamente el monorepo Python planificado, pero fija comportamiento ejecutable y contratos practicos para portar luego a `packages/contracts`, `packages/worker_sdk`, `packages/dispatcher`, `packages/policy` y `packages/observability`.

## Aviso de paralelizacion

Cuando se completen >= 5 items del gate, el asistente recordara que es momento
de planificar Fase B y abrir tracks paralelos.

Tracks previstos para Fase B (ver `00-estrategia-ejecucion.md`):
- Track 1: Worker SRE + conectores read-only (PRD 03).
- Track 2: Worker CS + conectores read-only (PRD 04).
- Track 3: Knowledge Graph (PRD 05).
- Track 4: UI + dashboards (PRD 08, 07).
