# PRDs Claude - Agentic Operations Platform

Esta carpeta contiene PRDs optimizados para trabajar con Claude Sonnet y Claude Opus en el desarrollo de una plataforma interna de agentes operativos.

## Uso recomendado con Claude

- Usa **Claude Sonnet** para implementar módulos, escribir tests, definir schemas, crear workers, revisar conectores y generar código repetible.
- Usa **Claude Opus** para decisiones de arquitectura, amenazas de seguridad, arbitraje entre trade-offs, evaluación de planes y revisión crítica de outputs.
- Mantén cada sesión de Claude con un PRD acotado. Evita darle todos los documentos a la vez salvo que estés haciendo una revisión de arquitectura global.

## Orden de lectura

1. [00-contexto-maestro.md](00-contexto-maestro.md)
2. [01-master-dispatcher.md](01-master-dispatcher.md)
3. [02-event-bus-redis-streams.md](02-event-bus-redis-streams.md)
4. [03-worker-sre.md](03-worker-sre.md)
5. [04-worker-customer-success.md](04-worker-customer-success.md)
6. [05-knowledge-graph.md](05-knowledge-graph.md)
7. [06-seguridad-permisos-prompt-injection.md](06-seguridad-permisos-prompt-injection.md)
8. [07-observabilidad-costes-evaluacion.md](07-observabilidad-costes-evaluacion.md)
9. [08-ui-operaciones-agentic.md](08-ui-operaciones-agentic.md)
10. [09-roadmap-mvp.md](09-roadmap-mvp.md)

## Convenciones para prompts

Cuando uses estos PRDs con Claude, estructura la petición así:

```text
<role>
Actua como arquitecto/ingeniero senior de plataformas agentic.
</role>

<context>
Pega aqui el PRD relevante.
</context>

<task>
Pide una salida concreta: implementar, revisar, descomponer, generar tests, crear schemas, etc.
</task>

<constraints>
Indica stack, limites de coste, permisos, seguridad, estilo de codigo y criterios de aceptacion.
</constraints>

<output>
Solicita formato exacto: diff, plan, JSON schema, lista de riesgos, tabla de requisitos, etc.
</output>
```

## Politica de modelos

| Uso | Modelo |
| --- | --- |
| Implementacion estandar | Sonnet |
| Refactors moderados | Sonnet |
| Generacion de tests | Sonnet |
| Routing simple y extraccion | Sonnet |
| Arquitectura compleja | Opus |
| Seguridad y threat modeling | Opus |
| Incidentes criticos o ambiguos | Opus |
| Evaluacion final de PRD o diseno | Opus |

