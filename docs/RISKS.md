# Riesgos

Clasificación: Impacto (A=alto, M=medio, B=bajo) × Probabilidad (A=alta, M=media, B=baja). Estado: abierto / mitigado / aceptado.

| # | Riesgo | Impacto | Prob. | Mitigación | Estado |
| --- | --- | --- | --- | --- | --- |
| R-01 | Amplitud del MVP retrasa el primer release | A | M | Alcance explícito (MVP_SCOPE), fases con criterios de finalización, fuera-de-alcance documentado | Mitigado |
| R-02 | Complejidad del motor (BYEs, seeds, doble eliminación) genera reescrituras | A | M | Motor puro/determinista, tests de propiedades, invariantes, desarrollo motor-first en Fase 2 | Mitigado |
| R-03 | Concurrencia e integridad de resultados | A | M | Optimistic locking, reporte bilateral, outbox transaccional, tests de concurrencia | Mitigado |
| R-04 | Fricción de autoalojamiento mata la adopción | A | M | `docker compose up -d`, defaults sensatos, `.env.example`, wizard, checklist, troubleshooting | Mitigado |
| R-05 | Seguridad y confianza (suplantación, alteración, evidencias) | A | M | Modelo de amenazas, autorización en backend, privacidad de evidencias, auditoría | Mitigado |
| R-06 | Mantenimiento de 3 adaptadores oficiales | M | M | Adaptadores como configuración tipada, plantilla de propuesta, versionado de config, tests por adaptador | Abierto |
| R-07 | Rate limits y cambios de API de Discord | M | M | Bot mínimo (notificaciones + slash), colas de envío, firma verificada, aislamiento del módulo | Abierto |
| R-08 | SMTP ausente en instancias autoalojadas | M | A | Log de correos + verificación opcional; documentación clara | Mitigado |
| R-09 | Crecimiento rápido exige escalar antes de lo previsto | M | B | Evolución documentada (worker/bot extraíbles, Redis/BullMQ), diseño 512+ desde el inicio | Mitigado |
| R-10 | Licencia MIT permite forks comerciales competidores | M | M | Competir por calidad/comunidad; gobernanza transparente | Aceptado |
| R-11 | Documentación desactualizada tras cambios | M | M | Regla: doc en el mismo PR; checklist de PR; revisión en cada fase | Mitigado |
| R-12 | Pruebas de accesibilidad insuficientes en bracket complejo | M | M | Alternativa textual, axe en E2E, revisión manual pre-release | Abierto |
| R-13 | Vulnerabilidades en dependencias | A | M | `pnpm audit` en CI, Dependabot, CodeQL, revisión de dependencias nuevas | Mitigado |
| R-14 | Pérdida de datos por fallos de operación | A | B | Backups documentados, jobs persistentes (cola en PG), health checks | Mitigado |

## Top 5 (del descubrimiento)

1. Amplitud del MVP (R-01).
2. Complejidad del motor de torneos (R-02).
3. Concurrencia e integridad (R-03).
4. Fricción de autoalojamiento (R-04).
5. Seguridad y confianza (R-05).

## Seguimiento

- Los riesgos se revisan al cierre de cada fase.
- Un riesgo pasa a "aceptado" solo con ADR o decisión del mantenedor.
- Los riesgos nuevos se agregan aquí con fecha y responsable.
