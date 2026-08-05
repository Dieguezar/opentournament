# Glosario

## A

- **Adaptador (de juego):** configuración tipada que define las reglas de un videojuego para el motor (tamaños de equipo, formatos, mapas, puntuación, empates).
- **Árbitro:** staff del torneo con permiso para resolver disputas y ver evidencias.
- **Audit log:** registro append-only de acciones críticas para trazabilidad.

## B

- **BO1/BO3/BO5:** series "best of" de 1, 3 o 5 partidas.
- **Bracket:** estructura de eliminación que muestra las partidas de un torneo.
- **BYE:** avance automático de un participante a la siguiente ronda sin jugar (por no ser potencia de 2).

## C

- **Capitán:** líder de un equipo; inscribe, hace check-in y reporta resultados.
- **Check-in:** confirmación de disponibilidad antes del torneo; su ausencia produce walkover.
- **CS2:** Counter-Strike 2.

## D

- **Descalificación (DQ):** exclusión por decisión administrativa o arbitral.
- **Disputa:** conflicto sobre un resultado que requiere arbitraje.
- **Doble eliminación:** formato donde se pierde al acumular dos derrotas.
- **Drizzle:** ORM/query builder de TypeScript sobre SQL.

## E

- **Eliminación sencilla:** formato donde una derrota elimina.
- **Empate:** resultado sin ganador; permitido solo si el adaptador lo define.
- **Evidencia:** captura o enlace que respalda un resultado o disputa.

## G

- **Genérico (adaptador):** adaptador por defecto para cualquier juego sin soporte oficial.

## I

- **Identidad:** vínculo entre un usuario y un proveedor OAuth (ej. Discord).
- **Inscripción:** solicitud de participación de un equipo en un torneo.

## J

- **Jobs:** tareas diferidas o programadas (cierre de check-in, recordatorios, timeouts) gestionadas en una cola PostgreSQL.

## L

- **Lista de espera (waitlist):** cola FIFO de inscripciones cuando el cupo está lleno.
- **Lobby:** sala de la partida (URL opcional; presencial no usa lobby).

## M

- **Match:** enfrentamiento entre dos participantes.
- **MatchGame:** partida individual dentro de una serie (mapa).
- **Moderador:** staff que gestiona inscripciones y mensajes sin resolver disputas.
- **Monolito modular:** una sola aplicación desplegable con límites de módulos claros.

## O

- **Organización:** contenedor raíz de torneos y equipos (comunidad, cibercafé, etc.).
- **Outbox:** patrón transaccional que publica eventos/notificaciones sin perderlos tras el commit.

## P

- **Participante:** equipo (o jugador individual) efectivo en el bracket.
- **PWA:** aplicación web instalable con caché de lectura.
- **Presencial:** torneo jugado en persona; sin lobby URL.

## R

- **Reporte bilateral:** ambos capitanes reportan el resultado; la coincidencia confirma automáticamente.
- **Reprogramación:** cambio de fecha/hora de una partida por un administrador.
- **Roster:** plantilla de un equipo (capitán, miembros, suplentes).

## S

- **Seed:** posición inicial asignada a un participante en el bracket.
- **SSE:** Server-Sent Events; actualizaciones unidireccionales del servidor al cliente.
- **S3-compatible:** API estándar de almacenamiento de objetos (MinIO, R2, S3).
- **Staff de torneo:** admin, árbitro y moderador.

## T

- **Tolerancia de retraso:** tiempo de espera configurable antes de un walkover.
- **Torneo individual:** formato donde el participante es un equipo de 1 jugador.

## V

- **Veto:** selección/eliminación de mapas antes de la partida (en el MVP se acuerda fuera de la plataforma y se registra).

## W

- **Walkover:** victoria concedida por incomparecencia o decisión administrativa.
- **Webhook:** notificación saliente hacia un servicio externo (diferido).
