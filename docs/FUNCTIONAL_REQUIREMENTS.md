# Requisitos funcionales

Identificadores `FR-<módulo>-<n>`. Prioridad: **P0** = bloqueante del MVP; **P1** = importante; **P2** = deseable. Los criterios de aceptación detallados viven en las historias de [docs/BACKLOG.md](BACKLOG.md).

## FR-AUTH — Autenticación y cuentas

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-AUTH-01 | Registro con correo + contraseña (Argon2id) y verificación por correo (si SMTP) | P0 |
| FR-AUTH-02 | Inicio de sesión con Discord OAuth y vinculación de identidades por correo verificado coincidente | P0 |
| FR-AUTH-03 | Recuperación de contraseña por correo (o token en consola sin SMTP) | P0 |
| FR-AUTH-04 | Sesión con cookie httpOnly + token CSRF; expiración configurable (defecto 7 días) | P0 |
| FR-AUTH-05 | Cierre de sesión y revocación de sesión | P0 |
| FR-AUTH-06 | Rate limiting por IP y por cuenta en login/registro/recuperación | P0 |
| FR-AUTH-07 | Perfil editable: nombre, avatar, IDs de juego por adaptador | P1 |

## FR-ORG — Organizaciones y roles

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-ORG-01 | Wizard de primer uso crea la primera organización (owner) | P0 |
| FR-ORG-02 | Invitar miembros por correo con rol owner/admin/miembro | P0 |
| FR-ORG-03 | Asignar roles de torneo (admin, árbitro, moderador) al staff | P0 |
| FR-ORG-04 | Editar perfil de organización (nombre, logo, enlaces) | P1 |
| FR-ORG-05 | Soft delete de organización (solo owner) con confirmación | P2 |
| FR-ORG-06 | Registro en audit log de cambios de membresía y roles | P0 |

## FR-TEAM — Equipos

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-TEAM-01 | Crear equipo permanente con capitán, miembros y suplentes | P0 |
| FR-TEAM-02 | Crear equipo efímero al inscribirse en un torneo | P0 |
| FR-TEAM-03 | Validar roster contra el adaptador (min/max, suplentes, IDs de jugador) | P0 |
| FR-TEAM-04 | Invitar/agregar miembros al equipo por correo o perfil | P1 |
| FR-TEAM-05 | Bloquear roster al cierre del check-in | P0 |
| FR-TEAM-06 | Torneo individual: el jugador es equipo de tamaño 1 | P0 |

## FR-TOUR — Torneos

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-TOUR-01 | Crear torneo con juego/adaptador, formato (sencilla/doble), fechas, reglas, cupo y privacidad | P0 |
| FR-TOUR-02 | Configurar series (BO1/BO3/BO5/personalizado), empates, veto externo con registro de mapas | P0 |
| FR-TOUR-03 | Configurar inscripciones: ventana, aprobación manual opcional, cupo | P0 |
| FR-TOUR-04 | Configurar check-in: hora límite y tolerancia de retraso | P0 |
| FR-TOUR-05 | Configurar ventanas: confirmación de resultados y disputa | P1 |
| FR-TOUR-06 | Publicar/despublicar torneo; página pública con SSR | P0 |
| FR-TOUR-07 | Editar reglas y configuración antes del inicio de partidas | P1 |
| FR-TOUR-08 | Cancelar torneo (solo admin) con notificación a participantes | P1 |

## FR-REG — Inscripciones

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-REG-01 | Inscribir equipo con aprobación automática o manual según config | P0 |
| FR-REG-02 | Lista de espera FIFO con notificación al liberarse cupo | P1 |
| FR-REG-03 | Aprobar/rechazar/cancelar inscripciones (admin/mod) | P0 |
| FR-REG-04 | Validar que el equipo no esté duplicado y cumpla el roster del adaptador | P0 |
| FR-REG-05 | Mostrar estado de inscripción al capitán y en el panel del torneo | P0 |

## FR-CHK — Check-in

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-CHK-01 | Check-in del equipo (web o `/checkin` en Discord) dentro de la ventana | P0 |
| FR-CHK-02 | Cierre automático de check-in (job) con walkover para ausentes | P0 |
| FR-CHK-03 | Tolerancia de retraso configurable aplicada por job | P0 |
| FR-CHK-04 | Vista de estado de check-in para el staff | P1 |

## FR-BRK — Brackets y motor

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-BRK-01 | Generar bracket de eliminación sencilla con seeds y BYEs | P0 |
| FR-BRK-02 | Generar bracket de doble eliminación (winners/losers, gran final sin reset por defecto) | P0 |
| FR-BRK-03 | Sorteo aleatorio y asignación manual de seeds | P0 |
| FR-BRK-04 | Avance automático al confirmar resultados | P0 |
| FR-BRK-05 | Correcciones administrativas (anular/revertir resultados, DQ, walkover) auditadas | P0 |
| FR-BRK-06 | Publicar resultados finales (podio) | P1 |

## FR-MCH — Partidas

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-MCH-01 | Programar partida con fecha/hora y lobby URL opcional | P0 |
| FR-MCH-02 | Registrar mapas/orden elegidos (veto externo) con confirmación | P1 |
| FR-MCH-03 | Reprogramar partida por admin con motivo | P0 |
| FR-MCH-04 | Aplicar walkover por ausencia o descalificación administrativa | P0 |
| FR-MCH-05 | Estado de partida: programada, en juego, finalizada, disputada, anulada | P0 |

## FR-RES — Resultados

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-RES-01 | Reporte bilateral: ambos capitanes reportan resultado | P0 |
| FR-RES-02 | Confirmación automática si los reportes coinciden y son válidos | P0 |
| FR-RES-03 | Timeout de confirmación escala al staff | P1 |
| FR-RES-04 | El resultado confirmado es inmutable salvo corrección administrativa | P0 |
| FR-RES-05 | Empates solo si el adaptador lo permite | P0 |

## FR-EV — Evidencias

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-EV-01 | Subir capturas (≤ 10 MB, ≤ 5 por resultado) vía URLs firmadas | P0 |
| FR-EV-02 | Adjuntar enlaces externos validados | P1 |
| FR-EV-03 | Evidencias privadas por defecto (staff y partes) | P0 |
| FR-EV-04 | Listado y vista de evidencias por partida/disputa | P1 |

## FR-DIS — Disputas y arbitraje

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-DIS-01 | Abrir disputa (diferencia de reportes o a solicitud del capitán) | P0 |
| FR-DIS-02 | Estados: abierta → en revisión → resuelta; mensajes e historial | P0 |
| FR-DIS-03 | Asignar árbitro (auto o manual) y notificar | P0 |
| FR-DIS-04 | Resolver con resultado final, motivo y evidencias consideradas | P0 |
| FR-DIS-05 | Aplicar la resolución al motor en transacción auditada | P0 |
| FR-DIS-06 | Auditoría completa de la disputa (actores, fechas, cambios) | P0 |

## FR-PUB — Experiencia pública

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-PUB-01 | Página pública del torneo (reglas, bracket, resultados, clasificación, equipos, streaming) con SSR | P0 |
| FR-PUB-02 | Actualizaciones en tiempo real vía SSE | P0 |
| FR-PUB-03 | PWA instalable con caché de lectura | P0 |
| FR-PUB-04 | Perfiles públicos de jugadores/equipos con resultados básicos | P1 |

## FR-DISCD — Discord

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-DISCD-01 | Login con Discord OAuth | P0 |
| FR-DISCD-02 | Bot de notificaciones (partidas, resultados, disputas, check-in) | P0 |
| FR-DISCD-03 | Slash commands `/checkin` y `/status` | P1 |
| FR-DISCD-04 | Configuración por token por instancia; sin roles/canales en el MVP | P0 |

## FR-NTF — Notificaciones

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-NTF-01 | Bandeja de notificaciones in-app con no leídas | P1 |
| FR-NTF-02 | Envío a Discord y correo según preferencias y disponibilidad | P0 |
| FR-NTF-03 | Preferencias de notificación por usuario | P2 |

## FR-JOB — Jobs

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-JOB-01 | Cierre de check-in y walkovers automáticos | P0 |
| FR-JOB-02 | Recordatorios de partida y check-in | P0 |
| FR-JOB-03 | Timeout de confirmación de resultados → escalado al staff | P1 |
| FR-JOB-04 | Notificación de disputas a árbitros | P0 |
| FR-JOB-05 | Correos asíncronos (verificación, recuperación) | P0 |
| FR-JOB-06 | Inicio/fin de etapas y publicación de resultados | P1 |

## FR-AUD — Auditoría

| ID | Requisito | Prio |
| --- | --- | --- |
| FR-AUD-01 | Audit log de acciones críticas: auth, roles, inscripciones, resultados, disputas, correcciones, configuración | P0 |
| FR-AUD-02 | Los eventos de dominio del motor se registran para trazabilidad | P0 |
| FR-AUD-03 | El audit log es append-only y no editable por API | P1 |
