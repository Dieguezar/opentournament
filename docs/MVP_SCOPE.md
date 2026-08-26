# Alcance del MVP

Este documento define exactamente qué entra y qué queda fuera del MVP de OpenTournament. Todo lo que no aparece aquí está fuera de alcance salvo que se registre una decisión nueva en `docs/DECISIONS.md`.

## 1. En alcance

### Organizaciones y usuarios

- Cuenta con correo + contraseña (verificación opcional según SMTP) y Discord OAuth opcional por instancia, con vinculación de identidades por correo verificado.
- Organizaciones con owner, admin y miembro; wizard de primer uso crea la primera organización.
- Perfil público básico: nombre, avatar, IDs de juego y resultados de torneos.
- Sin rol global de plataforma.

### Equipos

- Equipos permanentes con plantilla (capitán, miembros, suplentes) y equipos efímeros por torneo.
- Torneos individuales como equipos de tamaño 1.
- Roster bloqueado al cierre del check-in.
- Sin agentes libres (free agents) en torneos por equipos.

### Torneos

- Creación de torneo: nombre, juego/adaptador, fechas, descripción, reglas (texto enriquecido básico), formato (sencilla o doble eliminación), tamaño de equipo según adaptador, configuración de series (BO1/BO3/BO5/personalizado), empates permitidos, privacidad (público o no listado), capacidad, inscripciones abiertas con aprobación manual opcional, check-in con hora límite, tolerancia de retraso, ventanas de confirmación y disputa, enlaces de streaming.
- Sorteo aleatorio con seeds manuales y BYEs automáticos.
- Gran final de doble eliminación sin bracket reset por defecto (configurable).
- Partidas con fecha/hora, lobby URL opcional, mapas registrados, reprogramación por administradores, walkover y descalificación administrativa.
- Publicación de resultados finales.

### Resultados, evidencias y disputas

- Reporte bilateral con confirmación automática y timeout que escala al staff.
- Evidencias: capturas (hasta 10 MB, 5 por resultado) y enlaces externos; privadas por defecto.
- Disputas: abierta, en revisión, resuelta; mensajes; asignación de árbitro; resolución registrada con decisión y motivo; auditoría.

### Experiencia pública y PWA

- Página pública del torneo: descripción, reglas, bracket, resultados, clasificación, equipos, jugadores y enlaces de streaming; en tiempo real (SSE) y con SSR/SEO.
- PWA instalable con caché de lectura (sin acciones offline).

### Discord (integración opcional)

- La instalación y todos los flujos principales funcionan sin credenciales de Discord.
- Si la instancia lo habilita: Discord OAuth para login, webhooks de notificación y comandos slash (`/checkin`, `/status`).
- Configuración opt-in por variables de entorno.

### Adaptadores

- Adaptador genérico para cualquier juego.
- Adaptadores oficiales de Valorant, CS2, League of Legends y Super Smash Bros. Ultimate (configuración tipada, sin integraciones externas obligatorias).

### Operación

- Monorepo pnpm + Turborepo; apps `web` (Next.js) y `api` (Fastify); worker y bot como módulos de la API.
- PostgreSQL + Drizzle; cola de jobs en PostgreSQL.
- S3-compatible con MinIO en desarrollo.
- Docker Compose (`web`, `api`, `postgres`, `minio`).
- CI en GitHub Actions (lint, typecheck, tests, build, CodeQL, Dependabot).
- Seed de datos de demostración.

## 2. Fuera de alcance (post-MVP)

- Pagos e inscripciones de pago; premios.
- Round-robin, suizo, grupos + playoffs, temporadas, clasificatorias.
- Widgets embebibles y overlay OBS.
- Veto interactivo de mapas.
- Check-in por partida; reprogramación entre capitanes.
- Chat interno de la plataforma.
- Apelaciones y sanciones formales.
- Integraciones con APIs de juegos (Riot, Steam, etc.).
- Tauri (app de escritorio).
- Servicio cloud administrado, dominios personalizados, analítica avanzada.
- Moderación global, baneos, roles de plataforma.
- Acciones offline de escritura y sincronización.
- Notificaciones push web (se evalúa en fase 6; el MVP usa SSE con la app abierta).
- Webhooks salientes.

## 3. Límites numéricos de diseño

| Parámetro                                       | Valor                 |
| ----------------------------------------------- | --------------------- |
| Participantes por torneo (objetivo)             | 8–128                 |
| Participantes por torneo (soporte sin rediseño) | 512+                  |
| Evidencia por archivo                           | ≤ 10 MB               |
| Evidencias por resultado                        | ≤ 5                   |
| Tolerancia de retraso (defecto)                 | 10 min (configurable) |
| Confirmación de resultados (defecto)            | 30 min (configurable) |
| Ventana de disputa (defecto)                    | 60 min (configurable) |
| Usuarios concurrentes (smoke)                   | 256                   |

## 4. Criterio de aceptación del alcance

Una funcionalidad está "en alcance" solo si cumple todas las condiciones:

1. Está listada en este documento (o se agregó con un ADR aprobado).
2. Tiene historias en el backlog con criterios de aceptación.
3. Tiene pruebas planificadas en `docs/TESTING_STRATEGY.md`.
4. No requiere microservicios, Redis ni procesos separados.
5. No compromete la instalación con `docker compose up -d`.
