# Registro de Decisiones (ADRs)

Este documento registra las decisiones de producto, arquitectura y proceso de OpenTournament en formato Architecture Decision Record. Cada decisión incluye identificador, fecha, tema, opciones consideradas, decisión, motivo, consecuencias y estado.

- Fecha de las decisiones: 2026-08-05
- Proceso: entrevista de descubrimiento en bloques (Etapa A), con recomendación y aprobación del producto.
- Estado: **aprobada** = decidida en entrevista; **propuesta** = supuesto por defecto pendiente de confirmación en la revisión de la especificación.

## ADR-001 — Licencia MIT

- **Tema:** Licencia del proyecto open source.
- **Opciones:** MIT | Apache 2.0 | AGPL-3.0.
- **Decisión:** MIT.
- **Motivo:** Máxima adopción y facilidad de contribuciones; permite uso comercial (incluido el futuro servicio cloud) sin obligación de compartir modificaciones; es el estándar para herramientas de comunidad.
- **Consecuencias:** Cualquier tercero puede hacer fork y competir comercialmente; el proyecto compite por calidad y comunidad, no por licencia.
- **Estado:** aprobada.

## ADR-002 — Monolito modular

- **Tema:** Estilo de arquitectura.
- **Opciones:** Monolito modular | Microservicios | Modularidad por paquetes sin apps separadas.
- **Decisión:** Monolito modular con monorepo; sin microservicios.
- **Motivo:** No existe una razón técnica probada para microservicios a la escala del MVP (8–128 participantes, un deployable); el monolito modular reduce costos operativos y mantiene límites de módulos claros.
- **Consecuencias:** Escalar más adelante puede requerir extraer worker o bot; el diseño por paquetes lo facilita.
- **Estado:** aprobada.

## ADR-003 — Organizador principal

- **Tema:** Público objetivo primario del MVP.
- **Opciones:** Comunidades/cibercafés/organizadores independientes | Universidades | Streamers y servidores Discord | Todos por igual.
- **Decisión:** Comunidades, cibercafés y organizadores independientes.
- **Motivo:** Perfil más amplio, alineado con autoalojamiento y bajo costo; exige UX simple.
- **Consecuencias:** Onboarding rápido y plantillas; universidades y streamers son secundarios en priorización.
- **Estado:** aprobada.

## ADR-004 — Tamaño de torneos

- **Tema:** Tamaño típico a optimizar.
- **Opciones:** 8–32 | 8–128 escalable | 128–1024+ desde el inicio.
- **Decisión:** Optimizar para 8–128 participantes, con motor y esquema preparados para 512+ sin rediseño.
- **Motivo:** Cubre el caso típico sin sobrearquitectura; evita rediseñar al crecer.
- **Consecuencias:** Paginación, índices y concurrencia diseñados desde el inicio; pruebas de carga con 256 participantes.
- **Estado:** aprobada.

## ADR-005 — Modalidad online-first con soporte presencial

- **Tema:** Modalidad de los torneos.
- **Opciones:** Solo online | Ambos online-first | Ambos presencial-first | Solo presencial.
- **Decisión:** Ambos, con online como flujo principal.
- **Motivo:** Mayor mercado; el presencial se modela como partida sin enlace de lobby y check-in alternativo.
- **Consecuencias:** El campo de lobby es opcional por partida; check-in presencial es un modo de check-in general.
- **Estado:** aprobada.

## ADR-006 — Adaptador genérico + oficiales de Valorant, CS2 y LoL

- **Tema:** Juegos con adaptador oficial en el MVP.
- **Opciones:** Genérico + 1 oficial | Solo genérico | Genérico + 2–3 oficiales.
- **Decisión:** Adaptador genérico + adaptadores oficiales de Valorant, CS2 y League of Legends.
- **Motivo:** El genérico cubre cualquier juego; tres juegos cubren las comunidades FPS y MOBA más grandes de LatAm y validan el diseño del adaptador.
- **Consecuencias:** Triple mantenimiento de adaptadores; se mitiga haciendo los adaptadores configuración tipada (ADR-024) y documentando el proceso de propuesta.
- **Estado:** aprobada.

## ADR-007 — Torneos gratuitos en el MVP

- **Tema:** Monetización de torneos.
- **Opciones:** Solo gratuitos | Cuota informativa con pago externo | Pasarela de pago integrada.
- **Decisión:** Solo torneos gratuitos.
- **Motivo:** Evita pasarelas, reembolsos, compliance y disputas bancarias en el MVP; el modelo de datos queda preparado para cuotas futuras.
- **Consecuencias:** El campo de "cuota de inscripción" no existe en el MVP; se agrega en fase 6 con migración simple.
- **Estado:** aprobada.

## ADR-008 — Roles por organización y por torneo

- **Tema:** Modelo de roles y permisos.
- **Opciones:** Roles de organización + roles por torneo | Solo roles por torneo | Solo roles globales.
- **Decisión:** Roles de organización (owner, admin, miembro) + roles por torneo (admin, árbitro, moderador).
- **Motivo:** Cubre comunidades con múltiples eventos y separa la gestión de la organización de la gestión del torneo.
- **Consecuencias:** Autorización de dos niveles en backend; catálogo de permisos en `docs/AUTHORIZATION_MODEL.md`.
- **Estado:** aprobada.

## ADR-009 — Equipos permanentes y efímeros

- **Tema:** Modelo de equipos.
- **Opciones:** Permanentes + por torneo | Solo por torneo | Solo permanentes.
- **Decisión:** Ambos: equipos con plantilla persistente y equipos creados por torneo.
- **Motivo:** Cubre cibercafés y comunidades con rosters estables y torneos casuales con equipos rápidos.
- **Consecuencias:** Un equipo efímero se convierte en permanente si el usuario lo decide después del torneo.
- **Estado:** aprobada.

## ADR-010 — Torneos individuales como equipo de 1

- **Tema:** Soporte de torneos individuales (1v1).
- **Opciones:** Sí, ambos | Solo equipos | Solo equipos sin planes.
- **Decisión:** Sí; el participante es siempre un equipo y un torneo individual es un equipo de tamaño mínimo 1.
- **Motivo:** El soporte sale casi gratis del mismo motor y cubre juegos 1v1 vía adaptador genérico.
- **Consecuencias:** Reglas de roster validan tamaños por adaptador; sin lógica especial para individuales.
- **Estado:** aprobada.

## ADR-011 — Perfil público básico

- **Tema:** Perfiles e historial competitivo.
- **Opciones:** Perfil público básico | Privado mínimo | Completo con historial/ranking.
- **Decisión:** Perfil público básico: nombre, avatar, IDs de juego y resultados de torneos.
- **Motivo:** Alimenta páginas públicas y reduce suplantación; rankings y estadísticas se postergan.
- **Consecuencias:** Historial agregado (victorias, posición) simple; estadísticas avanzadas en fase 6.
- **Estado:** aprobada.

## ADR-012 — Sin rol global de plataforma

- **Tema:** Administración de plataforma.
- **Opciones:** Sin rol global | Solo soporte técnico | Panel global.
- **Decisión:** Sin rol global; wizard de primer uso crea la primera organización.
- **Motivo:** Cada instancia autoalojada se gobierna sola; un panel global solo tendría sentido en el servicio cloud futuro.
- **Consecuencias:** No hay moderación global ni baneos de plataforma en el MVP.
- **Estado:** aprobada.

## ADR-013 — Autenticación correo + Discord OAuth

- **Tema:** Métodos de autenticación.
- **Opciones:** Correo + Discord | Solo Discord | Correo + Discord + Google/GitHub.
- **Decisión:** Correo + contraseña con verificación y Discord OAuth; vinculación de identidades por correo verificado coincidente.
- **Motivo:** Accesible para autoalojamiento (sin depender de proveedores externos) y alineado con el público objetivo.
- **Consecuencias:** SMTP configurable; sin SMTP los correos se loguean y la verificación puede desactivarse.
- **Estado:** aprobada.

## ADR-014 — Formatos: eliminación sencilla + doble eliminación

- **Tema:** Formatos de torneo del MVP.
- **Opciones:** Sencilla + doble | Solo sencilla | Sencilla + round-robin.
- **Decisión:** Eliminación sencilla y doble eliminación.
- **Motivo:** Son el estándar de los esports y los de mayor valor demostrable; round-robin y suizo quedan para fase 6.
- **Consecuencias:** El motor implementa brackets de ganadores y perdedores con gran final (sin reset por defecto, supuesto AF-09).
- **Estado:** aprobada.

## ADR-015 — Emparejamiento aleatorio con seeds manuales y BYEs automáticos

- **Tema:** Generación de enfrentamientos y seeds.
- **Opciones:** Aleatorio + seeds manuales | Bracket 100% manual | Auto-seed por ranking.
- **Decisión:** Sorteo aleatorio por defecto, seeds asignables manualmente y BYEs automáticos.
- **Motivo:** Cubre el 90% de los casos sin depender de un sistema de ranking inexistente.
- **Consecuencias:** Sin ranking automático en el MVP; el bracket manual completo queda como corrección administrativa.
- **Estado:** aprobada.

## ADR-016 — Series BO configurables con empates por adaptador

- **Tema:** Formato de partidas.
- **Opciones:** BO configurables + empates | BO1/BO3 fijos | Solo partidas individuales.
- **Decisión:** El torneo define BO1/BO3/BO5 o series personalizadas; el empate se permite solo si el adaptador del juego lo define.
- **Motivo:** Flexibilidad para distintas comunidades sin romper la cultura de los juegos soportados.
- **Consecuencias:** Resultado de partida tipado (ganador, empate, walkover, descalificación).
- **Estado:** aprobada.

## ADR-017 — Inscripción abierta con lista de espera y aprobación opcional

- **Tema:** Modelo de inscripción.
- **Opciones:** Abierta + espera + aprobación | Solo abierta con cupos | Solo invitación.
- **Decisión:** Inscripción abierta con límite de cupos, lista de espera automática y aprobación manual opcional por torneo.
- **Motivo:** Cubre torneos públicos y cerrados sin sobrecargar al organizador.
- **Consecuencias:** Estados de inscripción: pendiente, aprobada, en espera, rechazada, cancelada.
- **Estado:** aprobada.

## ADR-018 — Check-in general con walkover automático

- **Tema:** Modelo de check-in.
- **Opciones:** General + walkover | General + por partida | Sin check-in.
- **Decisión:** Check-in general obligatorio antes del torneo con hora límite configurable; ausencia = walkover.
- **Motivo:** Simple y cubre el caso principal; el check-in por partida queda para fases posteriores.
- **Consecuencias:** Jobs programados cierran el check-in y aplican walkovers (ADR-035).
- **Estado:** aprobada.

## ADR-019 — Tolerancia, walkover y reprogramación por administradores

- **Tema:** Ausencias, retrasos y reprogramación.
- **Opciones:** Tolerancia + walkover + admin | Walkover inmediato | Reprogramación entre capitanes.
- **Decisión:** Tolerancia de retraso configurable por torneo, walkover automático por ausencia y reprogramación manual por administradores.
- **Motivo:** Balance entre firmeza y flexibilidad sin añadir negociación entre capitanes al MVP.
- **Consecuencias:** Historial de reprogramaciones y motivo; auditoría de acciones administrativas.
- **Estado:** aprobada.

## ADR-020 — Reporte bilateral con confirmación automática

- **Tema:** Reporte y confirmación de resultados.
- **Opciones:** Bilateral automático | Ganador + confirmación | Solo staff.
- **Decisión:** Ambos capitanes reportan; si coinciden se confirma automáticamente y si difieren se abre disputa.
- **Motivo:** Estándar de la industria; robusto contra reportes sesgados.
- **Consecuencias:** Ventana de confirmación configurable (supuesto AF-05); timeout escala al staff.
- **Estado:** aprobada.

## ADR-021 — Evidencias de capturas y enlaces, privadas por defecto

- **Tema:** Tipos de evidencia y privacidad.
- **Opciones:** Capturas + enlaces | Solo enlaces | Capturas + videos subidos.
- **Decisión:** Capturas de pantalla (subidas a S3) y enlaces externos; privadas para el staff por defecto; los videos no se suben en el MVP.
- **Motivo:** Balance entre robustez de la evidencia y costo de almacenamiento/procesamiento.
- **Consecuencias:** Límites de tamaño por archivo y cantidad por resultado (supuesto AF-06); URLs firmadas.
- **Estado:** aprobada.

## ADR-022 — Disputas con flujo completo sin apelaciones

- **Tema:** Arbitraje de disputas.
- **Opciones:** Flujo completo sin apelaciones | Disputa mínima | Completo + apelaciones.
- **Decisión:** Disputa con estados (abierta, en revisión, resuelta), mensajes, asignación de árbitro, resolución registrada y auditoría; sin apelaciones ni sanciones.
- **Motivo:** Trazabilidad y calidad de arbitraje sin el peso de apelaciones en el MVP.
- **Consecuencias:** Las sanciones se representan vía descalificación/walkover administrativo; el registro de sanciones formales queda para fase 6.
- **Estado:** aprobada.

## ADR-023 — Bot de Discord con notificaciones y comandos slash

- **Tema:** Alcance del bot de Discord.
- **Opciones:** Notificaciones + slash | Solo notificaciones | Bot completo (roles, canales, reportes).
- **Decisión:** Bot con notificaciones (partidas, resultados, disputas) y comandos slash de check-in y estado; roles, canales privados y reportes desde Discord quedan para fase 6.
- **Motivo:** Máximo valor con mínimo alcance.
- **Consecuencias:** El bot es un módulo de la API (ADR-030); se configura con token por instancia.
- **Estado:** aprobada.

## ADR-024 — Adaptadores como configuración tipada

- **Tema:** Profundidad del sistema de adaptadores.
- **Opciones:** Config tipada | Metadatos básicos | Con integraciones externas.
- **Decisión:** Adaptadores como configuración tipada (tamaños de equipo, formatos, puntuación, mapas, empates, campos propios), sin integraciones externas en el MVP.
- **Motivo:** Robustez y mantenibilidad; las APIs públicas de juegos son limitadas o inestables.
- **Consecuencias:** Las integraciones externas (Riot, Steam) se evalúan en fase 6.
- **Estado:** aprobada.

## ADR-025 — Veto de mapas fuera de la plataforma con registro

- **Tema:** Sistema de veto de mapas.
- **Opciones:** Fuera + registro | Veto interactivo | Veto por staff.
- **Decisión:** El veto se acuerda fuera de la plataforma y el capitán registra los mapas elegidos al iniciar la partida.
- **Motivo:** Cero fricción técnica; el veto interactivo requiere tiempo real y UX compleja.
- **Consecuencias:** Campo de mapas/orden en la partida; el veto interactivo queda en fase 6.
- **Estado:** aprobada.

## ADR-026 — Experiencia pública con tiempo real; widgets y OBS en fase 6

- **Tema:** Experiencia pública del torneo.
- **Opciones:** Página pública + tiempo real | Estática | Todo (widgets + OBS) desde el MVP.
- **Decisión:** Página pública del torneo con bracket, resultados y clasificación en tiempo real (SSE), equipos, jugadores y enlaces de streaming; widgets embebibles y overlay OBS en fase 6.
- **Motivo:** Atractivo para espectadores sin ampliar el alcance.
- **Consecuencias:** SSR para SEO (Next.js); rutas públicas sin autenticación.
- **Estado:** aprobada.

## ADR-027 — PWA con caché de lectura

- **Tema:** PWA y funcionamiento offline.
- **Opciones:** Lectura offline | Instalable mínima | Acciones offline con sincronización.
- **Decisión:** PWA instalable con caché de lectura (bracket, reglas, resultados); sin acciones offline.
- **Motivo:** Evita la complejidad de resolución de conflictos; el modo offline completo queda para fases posteriores.
- **Consecuencias:** Service worker de lectura; sin cola de escrituras offline.
- **Estado:** aprobada.

## ADR-028 — Frontend con Next.js

- **Tema:** Framework de frontend.
- **Opciones:** Next.js | React + Vite | Remix.
- **Decisión:** Next.js (TypeScript).
- **Motivo:** SSR para SEO de páginas públicas, PWA, tiempo real y ecosistema maduro; la futura app Tauri puede reutilizar la web.
- **Consecuencias:** `apps/web` con App Router; renderizado público adecuado para indexación.
- **Estado:** aprobada.

## ADR-029 — Backend con Fastify

- **Tema:** Framework de backend/API.
- **Opciones:** Fastify | NestJS | Hono | API en Next.js.
- **Decisión:** Fastify.
- **Motivo:** Ligero, TypeScript, ecosistema de plugins maduro, fácil de probar; ideal para REST + OpenAPI + SSE.
- **Consecuencias:** La API es una app separada en el monorepo; la web consume la API.
- **Estado:** aprobada.

## ADR-030 — Worker y bot como módulos de la API

- **Tema:** Estructura de procesos.
- **Opciones:** Módulos de la API | Procesos separados | API + bot separado.
- **Decisión:** El scheduler de jobs y el bot de Discord viven dentro del proceso de la API.
- **Motivo:** Los jobs son temporizadores y envíos ligeros; un solo deployable reduce operación sin sacrificar capacidad.
- **Consecuencias:** Extraer worker o bot a procesos separados es una evolución documentada, no un requisito del MVP.
- **Estado:** aprobada.

## ADR-031 — Drizzle como capa de acceso a datos

- **Tema:** ORM/capa de datos.
- **Opciones:** Drizzle | Prisma | SQL nativo.
- **Decisión:** Drizzle sobre PostgreSQL.
- **Motivo:** SQL tipado, ligero, sin query engine binario (menos fricción en Docker) y control fino de consultas complejas.
- **Consecuencias:** Migraciones con drizzle-kit; el esquema se define en `packages/database`.
- **Estado:** aprobada.

## ADR-032 — Almacenamiento S3-compatible con MinIO

- **Tema:** Almacenamiento de archivos.
- **Opciones:** S3 + MinIO | Disco local | Sin subidas.
- **Decisión:** Abstracción S3-compatible con MinIO en Docker para desarrollo y R2/S3 en producción.
- **Motivo:** Un solo API de archivos para logos, avatares y evidencias; portable entre proveedores.
- **Consecuencias:** URLs firmadas, límites de tamaño y validación de contenido.
- **Estado:** aprobada.

## ADR-033 — Tiempo real con SSE

- **Tema:** Mecanismo de actualizaciones en tiempo real.
- **Opciones:** SSE | WebSockets | Polling.
- **Decisión:** Server-Sent Events para bracket, resultados y notificaciones.
- **Motivo:** Actualizaciones mayormente unidireccionales; SSE es más simple, sobre HTTP y con reconexión automática.
- **Consecuencias:** Sin chat bidireccional en la plataforma en el MVP; WebSockets se evalúan en fase 6 si se requiere chat.
- **Estado:** aprobada.

## ADR-034 — Vitest + Playwright

- **Tema:** Herramientas de testing.
- **Opciones:** Vitest + Playwright | Jest + Playwright | Vitest + Cypress.
- **Decisión:** Vitest para unitarias e integración; Playwright para E2E.
- **Motivo:** Rápido, TypeScript nativo y ecosistema actual del stack.
- **Consecuencias:** Pipeline de CI con test unitarios, integración y E2E.
- **Estado:** aprobada.

## ADR-035 — Cola de jobs en PostgreSQL

- **Tema:** Cola de trabajos.
- **Opciones:** Cola en Postgres | Redis + BullMQ | node-cron simple.
- **Decisión:** Tabla de jobs en PostgreSQL con scheduler en la API.
- **Motivo:** Cero servicios extra en Docker; los jobs sobreviven reinicios; suficiente para el volumen del MVP.
- **Consecuencias:** Redis/BullMQ es la evolución documentada si la carga o la distribución lo exigen.
- **Estado:** aprobada.

## ADR-036 — Monorepo con pnpm + Turborepo

- **Tema:** Tooling del monorepo.
- **Opciones:** pnpm + Turborepo | npm workspaces | Nx.
- **Decisión:** pnpm con workspaces y Turborepo.
- **Motivo:** Estándar para monorepos TypeScript con caché de tareas y builds.
- **Consecuencias:** Estructura `apps/` + `packages/` documentada en `docs/ARCHITECTURE.md`.
- **Estado:** aprobada.

## ADR-037 — Modelo de estados del motor de torneos

- **Tema:** Diseño del motor de torneos.
- **Opciones:** Estado + operaciones transaccionales | Event sourcing completo | Event sourcing parcial.
- **Decisión:** Máquina de estados explícita con operaciones transaccionales y registro de eventos de dominio para auditoría; sin event sourcing completo.
- **Motivo:** Complejidad controlada; las ventajas del event sourcing no justifican su costo en el MVP.
- **Consecuencias:** Reconstrucción de estado futura posible a partir del log de eventos si se decide migrar.
- **Estado:** aprobada.

## ADR-038 — Gobernanza open source

- **Tema:** Gobernanza del proyecto.
- **Opciones:** BDFL inicial | Comité electo | Sin gobernanza formal.
- **Decisión:** BDFL inicial (mantenedor principal) con mantenedores nombrados; decisiones de arquitectura registradas en este documento y tomadas por consenso de mantenedores.
- **Motivo:** Agilidad en etapas tempranas con transparencia total; evolucionable a comité cuando la comunidad crezca.
- **Consecuencias:** CODE_OF_CONDUCT, CONTRIBUTING, plantillas y política de seguridad ya publicados; versionado semver y Conventional Commits (supuesto AF-10).
- **Estado:** aprobada.

## ADR-039 — Plantillas de torneo versionadas por juego

- **Tema:** Diferenciación real de torneos según el videojuego.
- **Opciones:** Solo etiquetas visuales | Valores del formulario sin contrato | Plantillas versionadas dentro del adaptador.
- **Decisión:** Los adaptadores pueden publicar una plantilla editable y versionada con defaults de torneo y reglas específicas; la API aplica el merge y valida sus invariantes. Super Smash Bros. Ultimate inaugura el contrato con `smash_ultimate.standard_v1` y League of Legends lo extiende con `lol.standard_v1`.
- **Motivo:** Un torneo debe reflejar la cultura competitiva del juego sin duplicar el motor ni depender de que el frontend envíe valores correctos.
- **Consecuencias:** La configuración queda persistida por torneo, el roster y la terminología pueden variar por juego, y los cambios futuros de reglas requieren una nueva versión de plantilla.
- **Estado:** aprobada.

## ADR-040 — Resultados específicos dentro del documento del match

- **Tema:** Persistencia de detalles competitivos que varían según el juego.
- **Opciones:** Columnas específicas en el núcleo | Tabla polimórfica | Documento tipado dentro de `matches.result`.
- **Decisión:** Conservar el resumen común (`winnerId`, marcador) y agregar detalles tipados por adaptador dentro del JSONB del resultado. Smash Ultimate registra games, escenario, personajes, ganador y stocks; League of Legends registra partidas, ganador, lado azul, duración y Riot Match ID opcional.
- **Motivo:** El bracket necesita una lectura atómica del resultado sin acoplar el esquema relacional central a cada videojuego.
- **Consecuencias:** Cada adaptador debe validar su documento antes de persistirlo; futuras consultas analíticas por campos específicos podrían requerir índices JSONB o una proyección dedicada.
- **Estado:** aprobada.

## ADR-041 — Autoalojamiento seguro por defecto

- **Tema:** Defaults operativos de una instalación Docker nueva.
- **Opciones:** Demo y autenticación relajada por defecto | Perfil de producción seguro con opt-in explícito para demo | Dos Compose independientes.
- **Decisión:** Compose usa perfil de producción, exige un `SESSION_SECRET` no trivial, desactiva demo y cuentas sin verificar, reenvía toda la configuración soportada y encadena servicios mediante health checks. El desarrollo local conserva `NODE_ENV=development` de forma separada.
- **Motivo:** Una instancia autoalojada puede quedar expuesta a Internet; credenciales demo y secretos conocidos NO pueden ser el camino por defecto.
- **Consecuencias:** La instalación requiere generar un secreto antes del primer arranque; la demo se habilita explícitamente y la guía diferencia desarrollo de producción.
- **Estado:** aprobada.

## ADR-042 — Discord como integración opt-in

- **Tema:** Dependencia de Discord en el núcleo autoalojable.
- **Opciones:** Discord obligatorio | Discord opcional | Eliminar Discord.
- **Decisión:** Lectura pública, cuentas por correo y pases privados cubren todos los flujos principales. Discord OAuth, webhooks y comandos slash permanecen como integración opcional por instancia.
- **Motivo:** El organizador debe poder operar con infraestructura propia sin crear una aplicación externa, pero las comunidades que ya usan Discord conservan automatización útil.
- **Consecuencias:** La ausencia de variables `DISCORD_*` deshabilita la integración sin degradar torneos, reportes ni arbitraje.
- **Estado:** aprobada.

## Supuestos por defecto (estado: propuesta)

Estos valores se tomaron por defecto durante el descubrimiento y se confirman en la revisión de la especificación:

| ID    | Supuesto       | Valor por defecto                                                                                                                                 |
| ----- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| AF-01 | Idiomas        | Español e inglés; LatAm primero, sin bloquear el resto del mundo                                                                                  |
| AF-02 | Correo         | SMTP configurable; sin SMTP los correos se loguean y la verificación puede desactivarse                                                           |
| AF-03 | Comunicación   | Entre capitanes fuera de la plataforma (Discord); campo `lobbyUrl` opcional por partida                                                           |
| AF-04 | Check-in       | Ventana configurable; por defecto abre 24 h antes y cierra 1 h antes del inicio                                                                   |
| AF-05 | Ventanas       | Tolerancia de retraso 10 min; confirmación de resultados 30 min; disputa 60 min (todas configurables por torneo)                                  |
| AF-06 | Evidencias     | Máx. 10 MB por archivo y 5 archivos por resultado                                                                                                 |
| AF-07 | Seeds          | Manuales; los mejores seeds reciben BYEs                                                                                                          |
| AF-08 | Gran final     | Doble eliminación sin bracket reset por defecto (configurable)                                                                                    |
| AF-09 | Roster         | Bloqueado al cierre del check-in                                                                                                                  |
| AF-10 | Calidad        | Conventional Commits, semver, Dependabot, logs estructurados (pino) y auditoría de acciones críticas                                              |
| AF-11 | IDs            | UUID v4 generado con `gen_random_uuid()` en PostgreSQL                                                                                            |
| AF-12 | Sesiones       | Cookie httpOnly + token CSRF; contraseñas con Argon2id; rate limiting global y por ruta                                                           |
| AF-13 | Agentes libres | Sin inscripción de agentes libres en torneos por equipos en el MVP (los equipos se inscriben completos)                                           |
| AF-14 | Chat           | Sin chat interno de la plataforma en el MVP                                                                                                       |
| AF-15 | Cloud futuro   | El servicio cloud solo agregará extras de infraestructura (storage, dominios, analítica); las funciones core del open source nunca serán privadas |
| AF-16 | Observabilidad | Logs estructurados, health checks y métricas básicas; OpenTelemetry y dashboards en fase 5/6                                                      |
