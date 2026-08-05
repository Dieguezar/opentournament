# Backlog

Historias de usuario en el formato estándar del proyecto. Prioridad: P0 (bloqueante del MVP), P1 (importante), P2 (deseable). Cada historia referencia requisitos de [FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md).

## Épicas

| Épica | Fase | Historias |
| --- | --- | --- |
| EPIC-AUTH — Autenticación y cuentas | 1 | AUTH-01 … AUTH-06 |
| EPIC-ORG — Organizaciones y roles | 1 | ORG-01 … ORG-04 |
| EPIC-TOUR — Torneos y brackets | 2 | TOUR-01 … TOUR-09 |
| EPIC-RES — Resultados, evidencias y disputas | 3 | RES-01 … RES-06 |
| EPIC-DISC — Discord, tiempo real y PWA | 4 | DISC-01 … DISC-04 |
| EPIC-OS — Preparación open source | 5 | OS-01 … OS-03 |

---

## EPIC-AUTH — Autenticación y cuentas

### AUTH-01 — Registro con correo y verificación

- **ID:** AUTH-01
- **Épica:** EPIC-AUTH
- **Título:** Registro de cuenta con correo y contraseña
- **Como:** organizador nuevo
- **Quiero:** crear mi cuenta con correo y contraseña y verificarla
- **Para:** acceder a la plataforma y crear mi organización
- **Prioridad:** P0
- **Dependencias:** monorepo, base de datos, envío de correo (o log)
- **Reglas de negocio:** contraseña mínima 8 caracteres; hash Argon2id; si no hay SMTP y `ALLOW_UNVERIFIED_EMAILS=false`, no se puede completar la verificación por correo (el admin lo decide).
- **Criterios de aceptación:**
  ```gherkin
  Dado que no tengo cuenta
  Cuando me registro con un correo y contraseña válidos
  Entonces se crea mi cuenta con estado "sin verificar"
  Y se envía un correo (o se registra en el log) con un enlace de verificación
  Y puedo iniciar sesión solo después de verificar el correo (o según política de la instancia)
  ```
- **Casos límite:** correo duplicado (error claro); contraseña débil; enlace expirado (24 h).
- **Pruebas requeridas:** unitarias de hash y validación; integración de registro; E2E de verificación.

### AUTH-02 — Inicio de sesión y sesión

- **ID:** AUTH-02
- **Épica:** EPIC-AUTH
- **Título:** Iniciar y cerrar sesión
- **Como:** usuario registrado
- **Quiero:** iniciar y cerrar sesión de forma segura
- **Para:** proteger mi cuenta
- **Prioridad:** P0
- **Dependencias:** AUTH-01
- **Reglas de negocio:** cookie httpOnly + SameSite; token CSRF en mutaciones; expiración 7 días por defecto; cierre de sesión revoca la sesión.
- **Criterios de aceptación:**
  ```gherkin
  Dado un usuario con credenciales válidas
  Cuando inicia sesión
  Entonces recibe una cookie de sesión y puede acceder a sus recursos
  Cuando cierra sesión
  Entonces la sesión queda revocada y los recursos protegidos dejan de responder
  ```
- **Casos límite:** credenciales incorrectas (error genérico), sesión expirada (redirect a login), rate limiting.
- **Pruebas requeridas:** integración de sesión/CSRF; tests de rate limiting.

### AUTH-03 — Recuperación de contraseña

- **ID:** AUTH-03
- **Épica:** EPIC-AUTH
- **Título:** Recuperar contraseña olvidada
- **Como:** usuario
- **Quiero:** restablecer mi contraseña con un enlace temporal
- **Para:** no quedarme fuera de mi cuenta
- **Prioridad:** P0
- **Dependencias:** AUTH-01
- **Reglas de negocio:** token de un solo uso, expira en 1 h; no revelar si el correo existe; invalidar tokens anteriores.
- **Criterios de aceptación:**
  ```gherkin
  Dado que olvidé mi contraseña
  Cuando solicito recuperación con mi correo
  Entonces se envía un enlace de un solo uso
  Y al usarlo puedo definir una contraseña nueva
  Y las sesiones anteriores quedan revocadas
  ```
- **Casos límite:** token expirado/usado; correo inexistente (misma respuesta).
- **Pruebas requeridas:** integración; test de revocación.

### AUTH-04 — Inicio de sesión con Discord

- **ID:** AUTH-04
- **Épica:** EPIC-AUTH
- **Título:** Iniciar sesión con Discord y vincular identidades
- **Como:** usuario con Discord
- **Quiero:** entrar con mi cuenta de Discord
- **Para:** no crear otra contraseña
- **Prioridad:** P0
- **Dependencias:** aplicación Discord configurada
- **Reglas de negocio:** flujo OAuth con `state`; si el correo de Discord coincide con una cuenta verificada se vincula; si no, se crea cuenta nueva (o se pide verificar).
- **Criterios de aceptación:**
  ```gherkin
  Dado que tengo una cuenta de Discord
  Cuando elijo "Iniciar con Discord"
  Entonces soy autenticado y redirigido de vuelta con sesión iniciada
  Y mi identidad queda vinculada a mi usuario
  ```
- **Casos límite:** cancelación de OAuth; correo de Discord sin verificar en Discord; cuenta existente con el mismo correo.
- **Pruebas requeridas:** integración con mock de Discord; test de vinculación.

### AUTH-05 — Perfil de usuario

- **ID:** AUTH-05
- **Épica:** EPIC-AUTH
- **Título:** Editar perfil y IDs de juego
- **Como:** usuario
- **Quiero:** editar mi nombre, avatar e IDs de juego
- **Para:** identificarme en torneos y perfiles públicos
- **Prioridad:** P1
- **Dependencias:** AUTH-01, adaptadores
- **Reglas de negocio:** IDs de juego validados por adaptador; avatar ≤ 2 MB (PNG/JPEG/WebP).
- **Criterios de aceptación:**
  ```gherkin
  Dado mi perfil
  Cuando edito mi nombre, avatar o IDs de juego válidos
  Entonces el perfil público refleja los cambios
  Y un ID inválido muestra error de validación
  ```
- **Casos límite:** ID duplicado de otro usuario (se permite, se muestra warning); avatar sobredimensionado.
- **Pruebas requeridas:** unitarias de validación; integración.

### AUTH-06 — Bandeja de notificaciones

- **ID:** AUTH-06
- **Épica:** EPIC-AUTH
- **Título:** Ver notificaciones in-app
- **Como:** usuario
- **Quiero:** ver mis notificaciones y marcarlas como leídas
- **Para:** no perder eventos de mis torneos
- **Prioridad:** P1
- **Dependencias:** motor de notificaciones (outbox)
- **Reglas de negocio:** paginadas; no leídas primero; acceso solo al dueño.
- **Criterios de aceptación:**
  ```gherkin
  Dado un usuario con notificaciones
  Cuando abre su bandeja
  Entonces ve las notificaciones no leídas primero
  Y puede marcarlas como leídas individualmente
  ```
- **Casos límite:** 100+ notificaciones (paginación); notificación de torneo borrado.
- **Pruebas requeridas:** integración; E2E.

---

## EPIC-ORG — Organizaciones y roles

### ORG-01 — Wizard de primer uso

- **ID:** ORG-01
- **Épica:** EPIC-ORG
- **Título:** Crear la primera organización
- **Como:** primer usuario de la instancia
- **Quiero:** crear mi organización con un asistente
- **Para:** empezar a organizar torneos
- **Prioridad:** P0
- **Dependencias:** AUTH-01
- **Reglas de negocio:** solo el primer usuario sin organización ve el wizard; se crea como owner; slug único.
- **Criterios de aceptación:**
  ```gherkin
  Dado un usuario recién registrado sin organización
  Cuando completa el wizard con nombre y slug válidos
  Entonces se crea la organización y el usuario es owner
  ```
- **Casos límite:** slug ocupado; usuario con organización existente (no ve el wizard).
- **Pruebas requeridas:** E2E; integración.

### ORG-02 — Invitación de miembros y roles

- **ID:** ORG-02
- **Épica:** EPIC-ORG
- **Título:** Invitar miembros con rol
- **Como:** admin de organización
- **Quiero:** invitar a miembros por correo y asignarles rol (owner/admin/miembro)
- **Para:** administrar la organización en equipo
- **Prioridad:** P0
- **Dependencias:** ORG-01
- **Reglas de negocio:** solo admin/owner invita; nadie puede autopromoverse; la invitación expira en 7 días.
- **Criterios de aceptación:**
  ```gherkin
  Dado un admin de organización
  Cuando invita a un correo con rol "admin"
  Entonces el invitado recibe un enlace y, al aceptarlo, tiene ese rol
  ```
- **Casos límite:** invitación a usuario existente vs. nuevo; invitación expirada; rol superior al propio.
- **Pruebas requeridas:** integración de roles; test de autopromoción bloqueada.

### ORG-03 — Staff de torneo

- **ID:** ORG-03
- **Épica:** EPIC-ORG
- **Título:** Asignar staff a un torneo
- **Como:** admin de torneo
- **Quiero:** asignar admin, árbitro y moderador
- **Para:** delegar gestión y arbitraje
- **Prioridad:** P0
- **Dependencias:** ORG-02
- **Reglas de negocio:** roles por torneo; un miembro de la org no puede ser admin de torneo sin aprobación del org admin (rol efectivo).
- **Criterios de aceptación:**
  ```gherkin
  Dado un torneo con staff
  Cuando el admin asigna "árbitro" a un usuario
  Entonces el usuario puede ver y resolver las disputas asignadas
  Y no puede editar la configuración del torneo
  ```
- **Casos límite:** asignar staff a un no miembro (se invita primero).
- **Pruebas requeridas:** integración de permisos.

### ORG-04 — Auditoría de organización

- **ID:** ORG-04
- **Épica:** EPIC-ORG
- **Título:** Registrar cambios críticos en audit log
- **Como:** owner de organización
- **Quiero:** consultar el historial de cambios de membresía y roles
- **Para:** tener trazabilidad
- **Prioridad:** P0
- **Dependencias:** ORG-02
- **Reglas de negocio:** append-only; incluye actor, fecha, motivo.
- **Criterios de aceptación:**
  ```gherkin
  Dado un cambio de rol registrado
  Cuando consulto el audit log
  Entonces veo actor, destinatario, fecha y motivo
  ```
- **Casos límite:** intento de editar/borrar registros (no permitido).
- **Pruebas requeridas:** integración.

---

## EPIC-TOUR — Torneos y brackets

### TOUR-01 — Crear torneo

- **ID:** TOUR-01
- **Épica:** EPIC-TOUR
- **Título:** Crear y configurar un torneo
- **Como:** admin de organización
- **Quiero:** crear un torneo con juego, formato, fechas, reglas y cupo
- **Para:** publicar mi evento
- **Prioridad:** P0
- **Dependencias:** ORG-01, adaptadores
- **Reglas de negocio:** formato sencilla/doble; cupo 8–512; el adaptador define tamaños de equipo; serie BO1/BO3/BO5/personalizada; empates según adaptador.
- **Criterios de aceptación:**
  ```gherkin
  Dado un admin con una organización
  Cuando crea un torneo de Valorant doble eliminación con cupo 16 y BO3
  Entonces el torneo queda en estado "draft"
  Y aparece en el panel de la organización
  ```
- **Casos límite:** cupo inválido; juego sin adaptador válido (usa genérico).
- **Pruebas requeridas:** integración; validación.

### TOUR-02 — Reglas y configuración avanzada

- **ID:** TOUR-02
- **Épica:** EPIC-TOUR
- **Título:** Publicar reglas y configurar ventanas
- **Como:** admin de torneo
- **Quiero:** escribir reglas y configurar check-in, tolerancia y ventanas
- **Para:** que participantes y staff conozcan las condiciones
- **Prioridad:** P0
- **Dependencias:** TOUR-01
- **Reglas de negocio:** ventanas configurables con defaults (AF-04/AF-05); rich text sanitizado.
- **Criterios de aceptación:**
  ```gherkin
  Dado un torneo en draft
  Cuando el admin define reglas, hora límite de check-in y tolerancia 10 min
  Entonces la configuración queda guardada y visible en la página del torneo al publicarlo
  ```
- **Casos límite:** rich text con HTML malicioso (sanitizado); fechas incoherentes.
- **Pruebas requeridas:** integración; seguridad (XSS).

### TOUR-03 — Publicar torneo y página pública

- **ID:** TOUR-03
- **Épica:** EPIC-TOUR
- **Título:** Publicar el torneo
- **Como:** admin
- **Quiero:** publicar el torneo con página pública
- **Para:** que la comunidad se inscriba y siga el evento
- **Prioridad:** P0
- **Dependencias:** TOUR-02
- **Reglas de negocio:** público o no listado; SSR para SEO; sin autenticación para lectura.
- **Criterios de aceptación:**
  ```gherkin
  Dado un torneo publicado
  Cuando un visitante abre su URL
  Entonces ve reglas, fechas, cupo, inscripciones y (si existe) bracket
  ```
- **Casos límite:** torneo no listado (no indexado); torneo draft (404 o estado visible).
- **Pruebas requeridas:** E2E; SEO/Lighthouse.

### TOUR-04 — Inscripción, aprobación y lista de espera

- **ID:** TOUR-04
- **Épica:** EPIC-TOUR
- **Título:** Inscribir equipos con aprobación y espera
- **Como:** capitán
- **Quiero:** inscribir mi equipo y ver el estado
- **Para:** participar en el torneo
- **Prioridad:** P0
- **Dependencias:** TOUR-03, equipos
- **Reglas de negocio:** roster válido según adaptador; un equipo no se inscribe dos veces; FIFO en espera; aprobación manual según config.
- **Criterios de aceptación:**
  ```gherkin
  Dado un torneo abierto a inscripciones
  Cuando un capitán inscribe un equipo con roster válido
  Entonces la inscripción queda "pendiente" (o "aprobada" si es automática)
  Dado un torneo con cupo lleno
  Cuando un equipo intenta inscribirse
  Entonces pasa a la lista de espera en orden FIFO
  Y se le notifica al liberarse un cupo
  ```
- **Casos límite:** roster incompleto; mismo capitán en dos equipos del torneo; cierre de inscripciones.
- **Pruebas requeridas:** integración; E2E.

### TOUR-05 — Check-in general

- **ID:** TOUR-05
- **Épica:** EPIC-TOUR
- **Título:** Check-in de equipos
- **Como:** capitán
- **Quiero:** confirmar disponibilidad de mi equipo
- **Para:** asegurar mi lugar en el bracket
- **Prioridad:** P0
- **Dependencias:** TOUR-04
- **Reglas de negocio:** solo dentro de la ventana; roster se bloquea; ausentes → walkover al cerrar.
- **Criterios de aceptación:**
  ```gherkin
  Dado un torneo con check-in abierto
  Cuando el capitán hace check-in de su equipo
  Entonces el equipo queda confirmado y el roster bloqueado
  Dado que vence la hora límite
  Cuando el job de cierre se ejecuta
  Entonces los no confirmados reciben walkover
  ```
- **Casos límite:** check-in fuera de ventana; equipo aprobado pero sin roster completo.
- **Pruebas requeridas:** integración de jobs; E2E.

### TOUR-06 — Bracket de eliminación sencilla

- **ID:** TOUR-06
- **Épica:** EPIC-TOUR
- **Título:** Generar bracket de sencilla con seeds y BYEs
- **Como:** admin
- **Quiero:** generar el bracket con sorteo o seeds y BYEs automáticos
- **Para:** empezar el torneo
- **Prioridad:** P0
- **Dependencias:** TOUR-05
- **Reglas de negocio:** determinista dado el orden; BYEs a mejores seeds; no regenerar tras jugar (salvo corrección auditada).
- **Criterios de aceptación:**
  ```gherkin
  Dado un torneo con 12 equipos confirmados
  Cuando el admin genera el bracket
  Entonces se crean 8 partidas de primera ronda (4 BYEs)
  Y cada equipo aparece exactamente una vez
  ```
- **Casos límite:** 2–128 participantes; seeds incompletos (resto aleatorio).
- **Pruebas requeridas:** propiedades del motor; integración.

### TOUR-07 — Doble eliminación

- **ID:** TOUR-07
- **Épica:** EPIC-TOUR
- **Título:** Bracket de doble eliminación
- **Como:** admin
- **Quiero:** generar un bracket winners/losers con gran final
- **Para:** torneos con segunda oportunidad
- **Prioridad:** P0
- **Dependencias:** TOUR-06
- **Reglas de negocio:** 2 derrotas eliminan; gran final sin reset por defecto (configurable).
- **Criterios de aceptación:**
  ```gherkin
  Dado un torneo doble eliminación de 8 equipos
  Cuando se juegan y confirman resultados
  Entonces los perdedores pasan al bracket de perdedores
  Y un equipo con dos derrotas queda eliminado
  Y la gran final enfrenta al ganador de winners contra el de losers
  ```
- **Casos límite:** gran final con/ sin reset; bracket de perdedores con BYEs.
- **Pruebas requeridas:** propiedades; escenarios de gran final.

### TOUR-08 — Partidas: programación, lobby, mapas y reprogramación

- **ID:** TOUR-08
- **Épica:** EPIC-TOUR
- **Título:** Administrar partidas
- **Como:** admin de torneo
- **Quiero:** programar partidas, registrar lobby y mapas, y reprogramar
- **Para:** coordinar el desarrollo del torneo
- **Prioridad:** P0
- **Dependencias:** TOUR-06/07
- **Reglas de negocio:** lobby URL opcional; reprogramación con motivo (máx. configurable); mapas registrados por el capitán y confirmados.
- **Criterios de aceptación:**
  ```gherkin
  Dado una partida programada
  Cuando el admin la reprograma con motivo
  Entonces los capitanes reciben la nueva fecha y el motivo queda en el historial
  Dado un partido de Valorant BO3
  Cuando el capitán registra los mapas elegidos
  Entonces el rival los ve y debe confirmarlos
  ```
- **Casos límite:** reprogramación sin motivo (rechazada); maps no confirmados (pendiente).
- **Pruebas requeridas:** integración; E2E.

### TOUR-09 — Walkover y descalificación

- **ID:** TOUR-09
- **Épica:** EPIC-TOUR
- **Título:** Aplicar walkover y descalificaciones
- **Como:** admin
- **Quiero:** aplicar walkover por ausencia y descalificar equipos
- **Para:** mantener el torneo avanzando
- **Prioridad:** P0
- **Dependencias:** TOUR-08
- **Reglas de negocio:** motivo obligatorio; el rival avanza; auditoría.
- **Criterios de aceptación:**
  ```gherkin
  Dado un equipo ausente tras la tolerancia
  Cuando se aplica el walkover
  Entonces el rival avanza y la partida queda "walkover"
  Dado un equipo que viola reglas
  Cuando el admin lo descalifica con motivo
  Entonces queda "disqualified" y su rival avanza
  ```
- **Casos límite:** descalificar al único equipo restante (torneo se cancela/finaliza); doble walkover.
- **Pruebas requeridas:** integración; motor.

---

## EPIC-RES — Resultados, evidencias y disputas

### RES-01 — Reporte bilateral

- **ID:** RES-01
- **Épica:** EPIC-RES
- **Título:** Reportar resultados de forma bilateral
- **Como:** capitán
- **Quiero:** reportar el resultado de mi partida
- **Para:** que el bracket avance
- **Prioridad:** P0
- **Dependencias:** TOUR-08
- **Reglas de negocio:** solo capitanes de la partida; empate solo si el adaptador lo permite; reportes con score.
- **Criterios de aceptación:**
  ```gherkin
  Dado una partida finalizada
  Cuando ambos capitanes reportan el mismo resultado
  Entonces el resultado se confirma automáticamente
  Cuando los reportes difieren
  Entonces se abre una disputa con motivo "result_conflict"
  ```
- **Casos límite:** tercer reporte (rechazado); resultado imposible (ambos ganan).
- **Pruebas requeridas:** integración; concurrencia.

### RES-02 — Timeout de confirmación

- **ID:** RES-02
- **Épica:** EPIC-RES
- **Título:** Escalar resultados sin confirmar
- **Como:** admin
- **Quiero:** recibir aviso cuando un resultado no se confirma a tiempo
- **Para:** resolver estancamientos
- **Prioridad:** P1
- **Dependencias:** RES-01
- **Reglas de negocio:** ventana configurable (defecto 30 min); al vencer, notificación al staff.
- **Criterios de aceptación:**
  ```gherkin
  Dado un resultado reportado por un solo capitán
  Cuando vence la ventana de confirmación
  Entonces el caso escala al staff con el reporte visible
  ```
- **Casos límite:** confirmación justo antes del timeout (no escala).
- **Pruebas requeridas:** integración de jobs.

### RES-03 — Evidencias

- **ID:** RES-03
- **Épica:** EPIC-RES
- **Título:** Adjuntar evidencias a un resultado o disputa
- **Como:** capitán
- **Quiero:** subir capturas o enlaces como evidencia
- **Para:** respaldar mi reporte
- **Prioridad:** P0
- **Dependencias:** RES-01, storage
- **Reglas de negocio:** ≤ 10 MB y ≤ 5 archivos; tipos PNG/JPEG/WebP/GIF; privadas por defecto.
- **Criterios de aceptación:**
  ```gherkin
  Dado un resultado reportado
  Cuando subo 3 capturas válidas
  Entonces quedan asociadas y visibles para staff y partes
  Cuando subo un archivo de 20 MB
  Entonces se rechaza con error claro
  ```
- **Casos límite:** enlace externo inválido; evidencia a una disputa ajena (denegado).
- **Pruebas requeridas:** integración con MinIO; seguridad de archivos.

### RES-04 — Disputas

- **ID:** RES-04
- **Épica:** EPIC-RES
- **Título:** Abrir y gestionar una disputa
- **Como:** capitán o sistema
- **Quiero:** abrir una disputa y conversar con mensajes
- **Para:** resolver un conflicto de resultado
- **Prioridad:** P0
- **Dependencias:** RES-01
- **Reglas de negocio:** estados abierta/en revisión/resuelta; ventana de disputa configurable (defecto 60 min); acceso a partes, staff y árbitro.
- **Criterios de aceptación:**
  ```gherkin
  Dado un conflicto de reportes
  Cuando el sistema abre la disputa
  Entonces ambas partes y el staff pueden verla y añadir mensajes
  ```
- **Casos límite:** disputa fuera de ventana (rechazada); spam de mensajes (rate limiting).
- **Pruebas requeridas:** integración; E2E.

### RES-05 — Panel de árbitros y resolución

- **ID:** RES-05
- **Épica:** EPIC-RES
- **Título:** Resolver disputas
- **Como:** árbitro
- **Quiero:** revisar evidencias y registrar una resolución
- **Para:** cerrar el conflicto con trazabilidad
- **Prioridad:** P0
- **Dependencias:** RES-04
- **Reglas de negocio:** solo árbitro asignado o admin; resolución con resultado final, motivo y evidencias consideradas; aplica al motor en transacción.
- **Criterios de aceptación:**
  ```gherkin
  Dado una disputa en revisión asignada a mí
  Cuando registro una resolución con motivo
  Entonces la disputa queda "resuelta"
  Y el bracket avanza según la resolución
  ```
- **Casos límite:** resolver disputa no asignada (denegado); resolución incoherente (motor la rechaza).
- **Pruebas requeridas:** integración; motor.

### RES-06 — Auditoría de resultados

- **ID:** RES-06
- **Épica:** EPIC-RES
- **Título:** Registrar y consultar auditoría de resultados y disputas
- **Como:** admin
- **Quiero:** ver el historial completo de reportes, correcciones y resoluciones
- **Para:** responder ante reclamaciones
- **Prioridad:** P0
- **Dependencias:** RES-05
- **Reglas de negocio:** append-only; eventos de dominio persistidos.
- **Criterios de aceptación:**
  ```gherkin
  Dado un resultado corregido
  Cuando consulto el audit log de la partida
  Entonces veo el reporte original, la corrección, el actor y el motivo
  ```
- **Casos límite:** acceso de no-staff (denegado).
- **Pruebas requeridas:** integración.

---

## EPIC-DISC — Discord, tiempo real y PWA

### DISC-01 — Bot de notificaciones

- **ID:** DISC-01
- **Épica:** EPIC-DISC
- **Título:** Notificaciones por Discord
- **Como:** organizador
- **Quiero:** que el bot avise de partidas, resultados y disputas
- **Para:** mantener informada a mi comunidad
- **Prioridad:** P0
- **Dependencias:** Fases 2–3 completas
- **Reglas de negocio:** token por instancia; rate limits de Discord respetados; avisos sin datos sensibles.
- **Criterios de aceptación:**
  ```gherkin
  Dado un torneo con bot conectado
  Cuando se confirma un resultado
  Entonces el bot publica el aviso en el canal configurado
  ```
- **Casos límite:** bot sin permisos (error claro en logs); Discord caído (reintento).
- **Pruebas requeridas:** integración con gateway mock.

### DISC-02 — Slash commands

- **ID:** DISC-02
- **Épica:** EPIC-DISC
- **Título:** Check-in y estado desde Discord
- **Como:** capitán
- **Quiero:** hacer check-in y consultar estado con `/checkin` y `/status`
- **Para:** no depender de la web
- **Prioridad:** P1
- **Dependencias:** DISC-01, TOUR-05
- **Reglas de negocio:** interacción firmada; el check-in aplica al equipo del usuario en el torneo indicado.
- **Criterios de aceptación:**
  ```gherkin
  Dado un torneo con check-in abierto
  Cuando un capitán ejecuta /checkin <código>
  Entonces su equipo queda en check-in y recibe confirmación
  ```
- **Casos límite:** código inválido; usuario sin equipo en el torneo.
- **Pruebas requeridas:** integración de interacciones.

### DISC-03 — Tiempo real público

- **ID:** DISC-03
- **Épica:** EPIC-DISC
- **Título:** Bracket en vivo con SSE
- **Como:** visitante
- **Quiero:** ver el bracket y resultados actualizarse en vivo
- **Para:** seguir el torneo sin recargar
- **Prioridad:** P0
- **Dependencias:** TOUR-03, resultados
- **Reglas de negocio:** eventos públicos solo del torneo; reconexión con `Last-Event-ID`; keep-alive.
- **Criterios de aceptación:**
  ```gherkin
  Dado un visitante en la página pública
  Cuando se confirma un resultado
  Entonces el bracket se actualiza en menos de 1 s sin recargar
  ```
- **Casos límite:** reconexión tras caída; eventos privados filtrados.
- **Pruebas requeridas:** integración SSE; E2E; carga.

### DISC-04 — PWA instalable con caché de lectura

- **ID:** DISC-04
- **Épica:** EPIC-DISC
- **Título:** Instalar OpenTournament como PWA
- **Como:** usuario
- **Quiero:** instalar la app y leer bracket/reglas sin conexión
- **Para:** consultar el torneo desde el móvil
- **Prioridad:** P0
- **Dependencias:** TOUR-03
- **Reglas de negocio:** manifest y service worker; caché de lectura solo para páginas públicas y propias; sin escrituras offline.
- **Criterios de aceptación:**
  ```gherkin
  Dado un navegador compatible
  Cuando visito la app
  Entonces puedo instalarla como PWA
  Y al desconectarme puedo ver la última versión cacheada del bracket
  ```
- **Casos límite:** actualización de caché (stale); instalación iOS (limitaciones documentadas).
- **Pruebas requeridas:** E2E con Playwright; Lighthouse.

---

## EPIC-OS — Preparación open source

### OS-01 — Datos de demostración

- **ID:** OS-01
- **Épica:** EPIC-OS
- **Título:** Seed de demo
- **Como:** evaluador
- **Quiero:** un torneo de demostración poblado
- **Para:** probar la plataforma sin configurar todo
- **Prioridad:** P1
- **Dependencias:** Fases 1–4
- **Reglas de negocio:** `SEED_DEMO_DATA=true`; idempotente; solo en entornos no productivos.
- **Criterios de aceptación:**
  ```gherkin
  Dado un entorno nuevo con SEED_DEMO_DATA=true
  Cuando se ejecutan los seeds
  Entonces existe una organización demo con un torneo en curso y una disputa resuelta
  ```
- **Casos límite:** ejecutar dos veces (sin duplicados).
- **Pruebas requeridas:** integración.

### OS-02 — Instalación verificada desde cero

- **ID:** OS-02
- **Épica:** EPIC-OS
- **Título:** Instalación limpia con README
- **Como:** nuevo usuario
- **Quiero:** instalar y publicar un torneo siguiendo solo el README
- **Para:** validar la promesa de `docker compose up -d`
- **Prioridad:** P1
- **Dependencias:** Fases 1–4
- **Reglas de negocio:** sin secretos en el repo; `cp .env.example .env` suficiente.
- **Criterios de aceptación:**
  ```gherkin
  Dado un entorno limpio con Docker
  Cuando sigo el README paso a paso
  Entonces la instancia queda operativa y puedo publicar un torneo demo
  ```
- **Casos límite:** Windows/macOS/Linux; sin SMTP ni Discord.
- **Pruebas requeridas:** smoke de instalación en CI (job manual).

### OS-03 — Primer release

- **ID:** OS-03
- **Épica:** EPIC-OS
- **Título:** Release 1.0.0
- **Como:** mantenedor
- **Quiero:** publicar el primer release con imágenes y changelog
- **Para:** que la comunidad lo use y contribuya
- **Prioridad:** P1
- **Dependencias:** Fases 1–5 completas
- **Reglas de negocio:** semver; imágenes en GHCR; notas de release con breaking changes.
- **Criterios de aceptación:**
  ```gherkin
  Dado el pipeline verde
  Cuando se crea el tag v1.0.0
  Entonces se publican las imágenes y las notas de release
  ```
- **Casos límite:** fallo de publicación (reintento manual).
- **Pruebas requeridas:** verificación manual del artefacto.
