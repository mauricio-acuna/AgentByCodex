# Estrategia de Ejecución - Proyecto Actual

## Resumen

Adoptaremos una estrategia híbrida por fases, inspirada en las prácticas de la otra IA. Esto nos permitirá construir un núcleo crítico de forma secuencial y, posteriormente, abrir tracks paralelos para acelerar el desarrollo.

## Fase A - Secuencial

### Objetivo
Construir un núcleo crítico en una única sesión/IDE para evitar divergencias y asegurar la estabilidad de los contratos.

### Tareas Clave
1. Definir y congelar los contratos principales (`schemas`, `eventos`, `resultados`).
2. Implementar un Dispatcher mínimo con lógica básica de enrutamiento.
3. Crear un SDK para los Workers con manejo de errores y DLQ.
4. Configurar herramientas de observabilidad y tracking de costos.

### Salida Esperada
- Monorepo con contratos y SDK versionados.
- Tests de contrato funcionando.

## Fase B - Paralela

### Condiciones para Iniciar
- Contratos estables y versionados.
- SDK funcional con ejemplos end-to-end.
- Tests de contrato en verde.

### Tracks Paralelos
| Track | Descripción |
| --- | --- |
| 1 | Implementación de Workers especializados. |
| 2 | Desarrollo de la UI y dashboards. |
| 3 | Integración de sistemas externos (e.g., bases de datos, APIs). |

### Reglas
- Monorepo único con PR reviews obligatorios.
- Contratos de entrada/salida definidos antes de paralelizar.
- Integración diaria y tests obligatorios.

## Seguimiento y Bloqueadores

Mantendremos un registro vivo del progreso y bloqueadores en un archivo dedicado.