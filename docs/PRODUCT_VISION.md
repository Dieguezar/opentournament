# Visión de producto

## Declaración de visión

**OpenTournament** permite a cualquier comunidad u organizador independiente crear, administrar y publicar torneos de esports profesionales sin depender de herramientas cerradas, costosas o difíciles de instalar. Es open source, autoalojable y tan fácil de usar como de operar.

## Misión

Democratizar la organización de torneos de esports: que un cibercafé, una universidad, un servidor de Discord o un streamer pueda montar un torneo completo en minutos, con brackets confiables, resultados verificados y arbitraje transparente, desde su propia infraestructura.

## Problema

Las comunidades de esports (especialmente en LatAm) dependen de herramientas fragmentadas: hojas de cálculo para inscripciones, plataformas cerradas con costos ocultos, brackets de terceros sin control de resultados, y Discord como "pegamento" improvisado. Los organizadores pierden tiempo, los resultados se disputan sin evidencia y no existe una herramienta completa, abierta y autoalojable.

## Oportunidad

- Crecimiento sostenido de comunidades de esports amateur y semiprofesional.
- Herramientas existentes: cerradas (costo), fragmentadas (integración), o sin foco en el flujo completo (solo brackets).
- Un proyecto open source con MIT, instalación con `docker compose up -d` y foco en el organizador puede convertirse en la base comunitaria de referencia, con un futuro servicio cloud como opción administrada.

## Público objetivo

1. **Comunidades, cibercafés y organizadores independientes** (primario).
2. **Universidades y colegios** (secundario).
3. **Streamers y servidores de Discord** (secundario).

Ver [docs/USER_ROLES.md](USER_ROLES.md) para roles y [docs/PRD.md](PRD.md) para personas.

## Propuesta de valor

- **Flujo completo**, no solo brackets: inscripción, check-in, partidas, evidencias, disputas y resultados finales.
- **Confianza**: reporte bilateral, evidencias privadas y arbitraje auditado.
- **Libertad**: open source (MIT), autoalojable, datos bajo el control del organizador.
- **Bajo costo**: una instancia pequeña corre en hardware modesto.
- **Juego-agnóstico**: adaptador genérico + adaptadores oficiales de Valorant, CS2, LoL y Super Smash Bros. Ultimate.
- **Comunidad**: Discord nativo (OAuth, notificaciones y comandos slash).
- **Público**: página pública del torneo con tiempo real y PWA instalable.

## Principios del proyecto

1. Facilidad de instalación.
2. Excelente experiencia para organizadores.
3. Compatibilidad con distintos videojuegos (núcleo separado de las reglas).
4. Arquitectura modular, mantenible y sin sobrearquitectura.
5. Documentación completa para contribuir.
6. Seguridad desde el diseño.
7. Accesibilidad y diseño responsive.
8. Escalabilidad razonable (8–128 participantes; preparado para 512+).
9. Open source desde el día uno, con gobernanza transparente.
10. Separación clara entre el núcleo de torneos y las reglas específicas de cada juego.

## No es el objetivo (ahora)

- Ser una red social o plataforma de matchmaking generalista.
- Gestionar pagos o premios (torneos gratuitos en el MVP).
- Sustituir a Discord como canal de comunicación.
- Proveer integraciones con APIs de juegos (fase 6).
- Ser un servicio cloud desde el día uno (el autoalojamiento es el producto inicial).

## Futuro

- Widgets embebibles y overlay OBS.
- Round-robin, suizo, temporadas y rankings.
- Aplicación de escritorio con Tauri.
- Servicio cloud administrado con extras de infraestructura (dominios, storage, analítica), sin privatizar funciones core.
- Integraciones externas con APIs de juegos.

Ver [docs/ROADMAP.md](ROADMAP.md).
