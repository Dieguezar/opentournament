# Documento de Requisitos de Producto (PRD)

## 1. Resumen ejecutivo

OpenTournament es una plataforma web open source (MIT), autoalojable con Docker Compose e instalable como PWA, para gestionar el ciclo completo de torneos de esports. El MVP prioriza a comunidades, cibercafés y organizadores independientes con torneos de 8–128 participantes, online-first con soporte presencial, inscripciones gratuitas y flujo completo de creación a publicación de resultados, incluyendo reporte bilateral, evidencias y arbitraje. Stack: Next.js + Fastify + PostgreSQL (Drizzle) + S3-compatible, en un monolito modular.

## 2. Problema

Las comunidades de esports carecen de una herramienta completa, abierta y autoalojable para organizar torneos. Las opciones actuales son fragmentadas (brackets por un lado, inscripciones por otro), cerradas o costosas, y ninguna cubre el flujo completo con verificación de resultados y arbitraje transparente.

## 3. Oportunidad

Un proyecto MIT con instalación trivial y foco en el organizador puede convertirse en la herramienta comunitaria de referencia, con opción futura de servicio cloud administrado. El mercado amateur/semiprofesional de esports crece en LatAm y el resto del mundo.

## 4. Público objetivo

- Primario: comunidades, cibercafés y organizadores independientes.
- Secundario: universidades, streamers y servidores de Discord.
- Espectadores y participantes que consumen la página pública del torneo.

## 5. Propuesta de valor

Flujo completo, confianza (resultados verificados y arbitraje auditado), libertad (open source y autoalojable), bajo costo, juego-agnóstico (adaptador genérico + Valorant/CS2/LoL), integración con Discord y página pública con tiempo real.

## 6. Casos de uso principales

1. Crear una organización y un torneo con reglas.
2. Inscribir equipos (o jugadores individuales) con aprobación y lista de espera.
3. Realizar check-in general y generar brackets con seeds y BYEs.
4. Coordinar partidas (lobby, horario, reprogramación, walkover).
5. Reportar resultados de forma bilateral y confirmarlos.
6. Adjuntar evidencias y resolver disputas con árbitros.
7. Publicar y compartir el torneo (página pública, Discord, PWA).

## 7. Personas

- **Lucía, organizadora comunitaria (primaria):** administra torneos semanales de Valorant para su comunidad de Discord; quiere velocidad y cero dolores de cabeza; no es técnica.
- **Carlos, cibercafé:** organiza LANs presenciales y online; necesita check-in simple y brackets confiables.
- **Diego, capitán de equipo:** inscribe a su equipo, hace check-in, reporta resultados y sube capturas.
- **María, árbitra:** revisa disputas, consulta evidencias y resuelve con trazabilidad.
- **Andrés, espectador:** sigue el bracket y los resultados desde el teléfono sin crear cuenta.

## 8. Alcance del MVP

Ver [docs/MVP_SCOPE.md](MVP_SCOPE.md). En resumen: torneos de eliminación sencilla y doble, inscripción abierta con espera y aprobación, equipos permanentes y efímeros, individuales (equipo de 1), check-in general, series BO configurables, reporte bilateral, evidencias, disputas, página pública en tiempo real, PWA de lectura, auth correo + Discord, bot de Discord (notificaciones + slash), adaptador genérico + Valorant/CS2/LoL, y autoalojamiento con Docker Compose.

## 9. Fuera de alcance (MVP)

- Pagos, inscripciones de pago y premios.
- Round-robin, suizo, grupos + playoffs, temporadas y clasificatorias.
- Widgets embebibles y overlay OBS.
- Veto interactivo de mapas dentro de la plataforma.
- Check-in por partida y reprogramación entre capitanes.
- Chat interno de la plataforma.
- Apelaciones y sanciones formales.
- Integraciones con APIs de juegos.
- Aplicación de escritorio Tauri.
- Servicio cloud administrado.
- Roles globales de plataforma, moderación global y baneos.
- Acciones offline de escritura (check-in/reporte offline).

## 10. Requisitos funcionales

Ver [docs/FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md) (identificadores FR-*).

## 11. Requisitos no funcionales

Ver [docs/NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md) (identificadores NFR-*).

## 12. Flujos principales

Ver [docs/USER_FLOWS.md](USER_FLOWS.md): onboarding, creación de torneo, inscripción, check-in, bracket, partida, resultados, disputa, arbitraje y consumo público.

## 13. Métricas de éxito (MVP)

- **Activación:** tiempo medio desde la creación de la organización hasta un torneo publicado con bracket generado (< 15 min en demo).
- **Completitud:** % de torneos que llegan a resultados finales publicados (objetivo ≥ 70%).
- **Confianza:** % de resultados confirmados sin disputa (objetivo ≥ 90%).
- **Resolución:** % de disputas resueltas en ≤ 72 h (objetivo ≥ 95%).
- **Adopción:** instalaciones autoalojadas, estrellas y contribuciones en GitHub.
- **Calidad:** 0 bugs críticos abiertos en el release inicial; cobertura de tests del motor ≥ 95%.
- **Rendimiento:** NFR-01 (p95 API < 200 ms) y propagación SSE < 1 s.

## 14. Riesgos

Ver [docs/RISKS.md](RISKS.md). Los cinco principales: amplitud del MVP, complejidad del motor de torneos, concurrencia e integridad de resultados, fricción de autoalojamiento y seguridad/confianza.

## 15. Supuestos

Ver [docs/DECISIONS.md](DECISIONS.md), sección "Supuestos por defecto" (AF-01 a AF-16). Los más relevantes: idiomas es/en (LatAm primero); SMTP opcional; comunicación fuera de la plataforma; ventanas configurables (tolerancia 10 min, confirmación 30 min, disputa 60 min); evidencias 10 MB/5 archivos; roster bloqueado al check-in; gran final sin reset.

## 16. Dependencias

- Docker y Docker Compose para la instalación.
- PostgreSQL 16+, MinIO (o R2/S3) y Node.js 22+.
- Aplicación de Discord (OAuth + bot) para el organizador que quiera esa integración; el resto funciona sin Discord.
- SMTP opcional para verificación/recuperación de correo.

## 17. Restricciones

- Monolito modular; no microservicios sin justificación probada.
- PostgreSQL como base principal; SQLite solo para tests o futuro modo local.
- Autorización siempre en backend.
- TypeScript estricto, validación en cliente y servidor.
- Secretos fuera del repositorio; `.env.example` como referencia.
- Una instalación nueva debe poder iniciarse siguiendo el README.

## 18. Criterios para considerar terminado el MVP

1. Una instalación nueva con `docker compose up -d` permite crear organización y torneo, inscribir equipos, check-in, generar bracket de sencilla y doble eliminación, reportar/confirmar resultados, subir evidencias, resolver una disputa y publicar resultados.
2. La página pública del torneo muestra bracket y resultados en tiempo real (SSE) y es indexable.
3. Autenticación con correo y Discord; roles de organización y torneo aplicados en backend.
4. Bot de Discord envía notificaciones y responde comandos slash de check-in/estado.
5. PWA instalable con caché de lectura.
6. Suite de pruebas (unitarias, integración, E2E) verde en CI; motor con cobertura ≥ 95%; smoke de concurrencia y carga a 256 participantes superado.
7. Documentación completa (docs/) consistente con el comportamiento real.
8. Primer release semver publicado con política de seguridad y plantillas de contribución.
