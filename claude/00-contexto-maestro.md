# PRD 00 - Contexto Maestro

## Producto

Construir una **Agentic Operations Platform** interna: una capa de agentes de IA que coordina trabajo operativo real entre personas, herramientas corporativas y servicios cloud.

La plataforma no debe ser un chatbot generalista. Debe funcionar como sistema de orquestacion para tareas de SRE, Customer Success, soporte tecnico, producto y futuros workers especializados.

## Problema

Los equipos pierden tiempo reconstruyendo contexto entre herramientas: GitHub, CircleCI, Datadog, Jira, Notion, CRM, documentacion interna, logs e historiales de incidentes. Muchas tareas requieren leer varias fuentes, resumir, clasificar, decidir owner, preparar respuestas y proponer acciones.

## Hipotesis

Una arquitectura agentic con dispatcher central, workers por dominio, event bus, memoria temporal y controles de seguridad puede reducir tiempo operativo sin perder trazabilidad ni control humano.

## Principios

1. **Asistencia antes que autonomia**: el MVP recomienda, resume y prepara acciones; no ejecuta cambios criticos sin aprobacion.
2. **Trazabilidad obligatoria**: toda respuesta debe poder explicar fuentes, herramientas, decisiones y coste.
3. **Modelo adecuado a la tarea**: Sonnet por defecto; Opus solo cuando el riesgo, ambiguedad o complejidad lo justifique.
4. **Coste como requisito de producto**: cada tarea debe medir tokens, tool calls, modelo, latencia y coste estimado.
5. **Seguridad fuera del modelo**: permisos, politicas y approvals no dependen solo del LLM.
6. **Datos externos no confiables**: tickets, docs, logs y comentarios pueden contener prompt injection.

## Arquitectura objetivo

```text
Usuario / Webhook / Slack / API
        |
        v
Master Dispatcher
        |
        |-- clasifica intencion
        |-- recupera contexto
        |-- aplica politicas
        |-- selecciona modelo
        v
Redis Streams
        |
        |-------------------|
        |                   |
        v                   v
SRE Worker            CS Worker
        |                   |
        v                   v
GitHub/CircleCI       Jira/Notion/CRM
Datadog/AWS           MCP interno
        |                   |
        v                   v
Knowledge Graph / Memory / Temporal Search
        |
        v
Resultado + Auditoria + Coste + Evaluacion
```

## Alcance MVP

Incluido:

- Master Dispatcher.
- Redis Streams.
- Worker SRE read-heavy.
- Worker Customer Success read-heavy.
- Knowledge Graph limitado.
- Conectores GitHub, CircleCI, Datadog, Jira y Notion.
- Approval workflow para acciones sensibles.
- Auditoria y cost tracking.
- UI interna simple para tareas, resultados y approvals.

Fuera del MVP:

- Rollbacks automaticos.
- Cambios directos en infraestructura.
- Envio autonomo de comunicaciones externas.
- Decisiones legales, contractuales o comerciales.
- Acceso irrestricto a datos sensibles.
- Security/Data/Finance workers completos.

## Prompt maestro para Claude Opus

```text
<role>
Actua como arquitecto principal de una plataforma agentic empresarial.
</role>

<context>
Estamos construyendo una Agentic Operations Platform con Master Dispatcher, Redis Streams, workers SRE/CS, Knowledge Graph, conectores corporativos, approval workflow, auditoria y control de costes.
</context>

<goal>
Revisa el diseno para detectar riesgos tecnicos, riesgos de seguridad, acoplamientos, costes ocultos y decisiones que deberian validarse antes del MVP.
</goal>

<constraints>
Sonnet debe ser el modelo por defecto. Opus solo se usa para decisiones complejas, alto riesgo o evaluacion critica. El MVP debe ser read-heavy y requiere aprobacion humana para acciones mutativas.
</constraints>

<output>
Devuelve:
1. Riesgos ordenados por severidad.
2. Decisiones irreversibles o caras.
3. Recomendaciones concretas para simplificar el MVP.
4. Preguntas que el equipo debe responder antes de implementar.
</output>
```

