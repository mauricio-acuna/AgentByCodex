# Agentic Operations Platform

MVP ejecutable de la plataforma descrita en los PRDs de `claude/`.

Incluye:

- Master Dispatcher.
- Event bus en memoria con streams equivalentes a Redis Streams.
- SRE Worker.
- Customer Success Worker.
- Tool registry mock read-only para Datadog, GitHub, CircleCI, Jira y Notion.
- Policy engine con roles y niveles L0-L4.
- Deteccion basica de prompt injection en contenido no confiable.
- Approval workflow.
- Auditoria.
- Estimacion de coste por tarea.
- API HTTP sin dependencias externas.
- UI interna web para tareas, resultados, approvals y auditoria.
- Knowledge Graph local con fuentes, confianza, relaciones y busqueda.
- Tests en proceso unico para evitar restricciones de spawn del entorno.

## Requisitos

- Node.js 20 o superior.

En este Windows, PowerShell puede bloquear `npm.ps1`. Usa `npm.cmd`.

## Probar

```powershell
npm.cmd test
```

## Demo

```powershell
npm.cmd run demo
```

## Servidor

```powershell
npm.cmd run start
```

Abre:

```text
http://localhost:8080
```

Health:

```text
http://localhost:8080/health
```

## Ejemplo de tarea SRE

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/tasks -ContentType 'application/json' -Body '{
  "prompt": "Investiga por que subieron los errores 5xx del servicio billing-api",
  "domain_hint": "sre",
  "requested_by": {
    "id": "ana",
    "team": "sre",
    "roles": ["sre"]
  }
}'
```

## Ejemplo de tarea Customer Success

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/tasks -ContentType 'application/json' -Body '{
  "prompt": "Dame contexto de la cuenta Acme y prepara respuesta para el cliente sobre exportacion",
  "domain_hint": "customer_success",
  "requested_by": {
    "id": "lucia",
    "team": "cs",
    "roles": ["cs"]
  }
}'
```

## Documentacion

- [API](docs/API.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [PRDs Claude](claude/README.md)
