# Roles de usuario

## 1. Identidades y perfiles

- **Usuario autenticado:** persona con cuenta (correo o Discord vinculado). Tiene un perfil público básico.
- **Perfil público:** nombre, avatar, IDs de juego (Riot ID, SteamID64, nombre de invocador + región), resultados de torneos (posición, victorias/derrotas agregados).
- **Visitante:** usuario sin cuenta; solo accede a páginas públicas (torneo, bracket, resultados, perfiles).

## 2. Roles de organización

La organización es el contenedor raíz de OpenTournament. El primer usuario crea una organización mediante el wizard de primer uso.

| Rol | Permisos |
| --- | --- |
| **Owner** | Todo lo del admin + transferir propiedad, eliminar la organización, gestionar admins |
| **Admin** | Gestionar miembros, crear/editar torneos, configurar la organización (nombre, logo, enlaces) |
| **Miembro** | Ver la organización, participar en torneos, crear torneos si la organización lo permite (configurable) |

Reglas:
- Solo el owner puede eliminar la organización (soft delete + confirmación).
- Un usuario puede pertenecer a varias organizaciones.
- Los roles de organización no dan permisos sobre torneos específicos más allá de lo definido por el rol de torneo.

## 3. Roles de torneo

Cada torneo tiene staff independiente:

| Rol | Permisos |
| --- | --- |
| **Admin de torneo** | Todo del torneo: editar configuración y reglas, gestionar inscripciones, generar brackets, reprogramar, aplicar walkovers/DQ, asignar árbitros, publicar resultados |
| **Árbitro** | Ver evidencias, resolver disputas, registrar resoluciones, reportar resultados administrativamente (si el torneo lo permite) |
| **Moderador** | Gestionar inscripciones y mensajes de disputas, ayudar en check-in; sin editar configuración ni resolver disputas |

Reglas:
- El owner/admin de la organización puede nombrar staff de torneo.
- Los roles de torneo se asignan a usuarios registrados (no a correos arbitrarios).
- Los permisos se evalúan en backend para cada recurso.

## 4. Roles de equipo

| Rol | Permisos |
| --- | --- |
| **Capitán** | Editar roster, inscribir el equipo, hacer check-in, reportar resultados, abrir/responder disputas, registrar veto/mapas |
| **Miembro** | Ver el equipo, hacer check-in si el torneo lo permite, confirmar resultados si el capitán lo delega |
| **Suplente** | Listado en el roster; puede entrar al equipo antes del bloqueo de roster |

Reglas:
- Un equipo tiene exactamente un capitán en el MVP.
- El roster se bloquea al cierre del check-in (supuesto AF-09).
- En torneos individuales, el jugador es capitán y miembro del equipo de 1.

## 5. Roles de plataforma

- No existe rol global de plataforma en el MVP (ADR-012). Cada instancia es autónoma.
- El servicio cloud futuro podrá agregar roles de plataforma sin privatizar funciones core.

## 6. Matriz de permisos resumida

| Acción | Visitante | Miembro org | Admin org | Staff torneo | Capitán | Árbitro |
| --- | --- | --- | --- | --- | --- | --- |
| Ver torneo público | Sí | Sí | Sí | Sí | Sí | Sí |
| Crear organización | No | No | No | No | No | No (primera vía wizard) |
| Crear torneo | No | Según config | Sí | Sí | No | No |
| Editar torneo | No | No | Sí | Admin | No | No |
| Aprobar inscripciones | No | No | Sí | Admin/Mod | No | No |
| Hacer check-in | No | Si es miembro | Sí | Sí | Sí | No |
| Generar bracket | No | No | Sí | Admin | No | No |
| Reportar resultados | No | No | Sí | Admin (si aplica) | Sí | Sí (admin) |
| Ver evidencias | No | No | Sí | Admin/Árbitro | Solo las propias | Sí |
| Resolver disputas | No | No | Sí | Admin/Árbitro | No | Sí |
| Reprogramar partida | No | No | Sí | Admin | No | No |

El detalle formal de permisos (catálogo y enforcement) está en [docs/AUTHORIZATION_MODEL.md](AUTHORIZATION_MODEL.md).

## 7. Cambios de rol y auditoría

- Cada cambio de rol (organización o torneo) se registra en el audit log con actor, fecha y motivo.
- Un usuario no puede autopromoverse; solo el owner/admin correspondiente otorga roles.
