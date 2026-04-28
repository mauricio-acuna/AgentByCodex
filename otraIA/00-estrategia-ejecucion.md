00-estrategia-ejecucion.md

# Estrategia de Ejecucion - Agentic Operations Platform

> Documento maestro de como vamos a construir la plataforma. Define que se hace
> secuencial, que se paraleliza y cuando cambiamos de modo.

## Resumen

Hibrido por fases. Primero un nucleo critico construido secuencialmente en una
sola sesion/IDE para evitar divergencia de contratos. Despues, cuando los
schemas y el SDK esten congelados, se abren tracks paralelos en distintos IDEs.

## Mapa de dependencias

| PRD | Modulo | Depende de | Bloqueante |
| --- | --- | --- | --- |
| 02 | Event Bus (Redis Streams) | - | Si, raiz |
| 01 | Master Dispatcher | 02 | Si |
| 06 | Seguridad / Policy Engine | 02 | Transversal |
| 07 | Observabilidad / Coste | 02 | Transversal |
| 03 | Worker SRE | 01, 02, 06 | No |
| 04 | Worker CS | 01, 02, 06 | No |
| 05 | Knowledge Graph | 06 | No |
| 08 | UI | 01 (API), 07 | No |
| 09 | Roadmap | - | Documental |

## Fase A - Secuencial, en este IDE (NUCLEO)

Trabajo en una unica sesion. Riesgo alto si se paraleliza.

1. Congelar schemas: `task`, `event`, `result`, `audit` (PRD 02).
2. Esqueleto del Master Dispatcher + Worker SDK (PRD 01).
3. Policy engine minimo + clasificacion L0-L4 (PRD 06).
4. Cost tracking + tracing como libreria compartida (PRD 07).

Salida esperada: monorepo con `packages/contracts` y `packages/worker-sdk`
versionados. Contract tests verdes.

## Fase B - Paralela en varios IDEs (cuando A este congelada)

Una vez los contratos publicados como package interno, abrir ramas/IDEs
separados.

| Track | PRD | Owner / IDE |
| --- | --- | --- |
| 1 | 03 Worker SRE + conectores read-only | IDE A |
| 2 | 04 Worker CS + conectores read-only | IDE B |
| 3 | 05 Knowledge Graph (ingesta + retrieval) | IDE C |
| 4 | 08 UI + 07 dashboards | IDE D |

## Reglas para que el paralelo no explote

- Monorepo unico con `packages/contracts` y `packages/worker-sdk` versionados.
- Cambio en contracts = PR review obligatorio. Nunca edicion directa.
- Contract tests obligatorios entre dispatcher y cada worker.
- Cada track con su propio Redis Stream y consumer group.
- Una rama por track. Integracion diaria.
- No paralelizar nada sin contrato de entrada/salida fijado.

## Criterios para pasar de Fase A -> Fase B (gate go/no-go)

Marcar todos antes de abrir tracks paralelos:

- [ ] Schemas de evento estables (sin cambios en 3 dias).
- [ ] `packages/contracts` publicado y versionado (semver).
- [ ] Worker SDK con ejemplo end-to-end funcionando (worker dummy).
- [ ] Policy engine acepta tareas y bloquea acciones L2+ sin approval.
- [ ] Cost tracking emite metrica por task_id.
- [ ] Tests de contrato dispatcher <-> worker en verde en CI.
- [ ] DLQ funcional con un caso de fallo.

Cuando los 7 esten marcados, avisar al usuario: **"momento de paralelizar"**.

## Recordatorio activo

El asistente debe avisar al usuario cuando se cumpla el gate de Fase B, o
cuando se detecten 4+ items completados, para planificar el reparto de tracks.

Estado actual: **Fase A en curso**. Ver
[01-progreso.md](01-progreso.md) para el avance.
