# Motor de torneos

## 1. Objetivos

El motor de torneos (`packages/tournament-engine`) es el corazón de OpenTournament. Debe ser:

- **Puro y determinista:** mismas entradas → mismas salidas; sin I/O, sin tiempo real, sin aleatoriedad no inyectada.
- **Tipado:** entradas y salidas con TypeScript estricto (`packages/shared-types`).
- **Independiente:** sin dependencias de framework, HTTP, base de datos ni Discord.
- **Comprobable:** cobertura ≥ 95% con tests unitarios y de propiedades.
- **Auditable:** cada transición genera eventos de dominio persistentes.

## 2. Modelo de diseño

Se usa una **máquina de estados explícita** con operaciones transaccionales (ADR-037). El flujo típico:

```text
comando + estado actual  →  motor (función pura)  →  { nuevo estado, eventos }
```

- El **estado** es un snapshot tipado del torneo (etapas, brackets, rondas, partidas, participantes).
- Los **comandos** son operaciones de dominio: `GenerateBracket`, `ReportResult`, `ConfirmResult`, `ApplyWalkover`, `Disqualify`, `VoidResult`, `ResolveDispute`, `AdminCorrect`.
- Los **eventos** documentan qué pasó (`bracket.generated`, `match.result.confirmed`, `match.voided`, ...).
- La capa de servicios persiste el estado y los eventos en una transacción y despacha el outbox (notificaciones/SSE).
- No hay event sourcing completo; el snapshot es la fuente de verdad y los eventos son trazabilidad (reconstrucción futura posible).

## 3. Invariantes del motor

1. Un participante no puede estar en dos partidas simultáneas de la misma etapa.
2. Una partida no puede tener dos ganadores distintos confirmados.
3. El resultado solo se aplica si el formato de serie lo permite (empates según adaptador).
4. Cada partida avanza exactamente a una posición del bracket (o a la final de perdedores/gran final).
5. No se regenera un bracket con partidas ya jugadas (salvo corrección administrativa explícita y auditada).
6. Los BYEs no generan partidas; avanzan automáticamente al siguiente round.
7. En doble eliminación, un participante con 2 derrotas queda eliminado.
8. Toda corrección registra `reason` y actor.
9. El gran final sin reset por defecto: el ganador de winners necesita 1 victoria; el de losers necesita 2 (bracket reset configurable).
10. El estado es versionado (`version` + optimistic locking) para evitar escrituras concurrentes.

## 4. Algoritmos

### 4.1 Eliminación sencilla

- N = participantes validados (con check-in).
- Se completan los BYEs hasta la siguiente potencia de 2.
- Seeds: si se proveen, el mejor seed ocupa la primera posición estándar (1 vs. BYE o 16, 8 vs. 9, etc.); si no, sorteo aleatorio inyectado.
- Rondas: octavos → cuartos → semis → final.
- El ganador de cada partida avanza; el perdedor queda eliminado.

### 4.2 Doble eliminación

- Bracket de ganadores (W) y perdedores (L).
- La primera derrota envía al participante al bracket de perdedores.
- La segunda derrota elimina.
- La gran final: ganador de W vs. ganador de L.
  - Sin reset (defecto): el ganador de W necesita ganar 1 partida.
  - Con reset (configurable): si el ganador de L gana la primera gran final, se juega una segunda.
- Los BYEs se asignan en el bracket W; el bracket L empieza en la ronda correspondiente.

### 4.3 Emparejamiento

- **Sorteo aleatorio:** RNG inyectado (semilla o `Math.random` en el adaptador de API) para reproducibilidad en tests.
- **Seeds manuales:** lista ordenada de participantes; el motor aplica el ordenamiento estándar de bracket (1, N, 5, N-3, 3, N-1, 7, N-5... para potencias de 2).
- **BYEs automáticos:** los mejores seeds reciben BYE (AF-07).

## 5. Resultados y flujo competitivo

### 5.1 Reporte bilateral

1. `ReportResult(matchId, teamId, score)` por cada capitán.
2. Si ambos reportes coinciden (score, ganador, empates) → `ConfirmResult` automático.
3. Si difieren → evento `result.conflict` → se abre `Dispute` (razón `result_conflict`).
4. Timeout de confirmación (30 min por defecto) → `escalated` → notifica al staff.

### 5.2 Walkover, DQ y anulación

- `ApplyWalkover`: ausencia tras tolerancia → el rival avanza; se registra motivo.
- `Disqualify`: decisión administrativa/arbitral → el rival avanza y el sancionado pasa a `disqualified`.
- `VoidResult`: anula un resultado confirmado (corrección) → la partida vuelve a `scheduled` y las posiciones posteriores se recalculan de forma determinista.
- `ResolveDispute`: la resolución del árbitro se aplica como `ConfirmResult` o `VoidResult` con trazabilidad.

### 5.3 Avance automático

- Al confirmar una partida, el motor computa la posición de la siguiente ronda (o la final) y la publica como parte de la misma transacción.
- Si la siguiente ronda queda completa, la etapa pasa a `active`/`completed` según corresponda.
- Al finalizar la última partida, el torneo queda en estado `finalized` con podio.

## 6. Correcciones administrativas

Reglas:

- Antes de la primera partida: regenerar bracket permitido.
- Después: solo correcciones puntuales (`VoidResult`, `Disqualify`, `AdminCorrect`) con `reason` obligatorio.
- Toda corrección genera evento de auditoría con actor, motivo y `before`/`after`.

## 7. Eventos de dominio

Catálogo inicial:

- `tournament.created`, `tournament.config.updated`, `tournament.published`, `tournament.cancelled`
- `bracket.generated`, `bracket.regenerated`
- `match.scheduled`, `match.rescheduled`, `match.maps.registered`
- `result.reported`, `result.confirmed`, `result.conflict`, `result.escalated`, `result.voided`
- `walkover.applied`, `participant.disqualified`, `participant.eliminated`
- `dispute.opened`, `dispute.assigned`, `dispute.resolved`
- `stage.completed`, `tournament.finalized`

Cada evento: `{ id, type, aggregateId, version, actor, at, payload }`.

## 8. Interfaz con almacenamiento

- El motor recibe el estado (snapshot) y devuelve estado+eventos; no consulta la base.
- La capa de persistencia (servicios en `apps/api`) implementa la carga/guardado con repositorios tipados.
- Concurrencia: `version` en `Match`/`Tournament` con optimistic locking; al fallar el versionado, el request se reintenta con el estado fresco.

## 9. Tests requeridos

- Unitarios por comando y transición.
- De propiedades: para N participantes (2, 3, 5, 8, 16, 33, 64, 128), el bracket siempre queda completo, sin partidas huérfanas y con un único ganador.
- Escenarios: BYEs, seeds, empates permitidos/prohibidos, walkover, DQ, anulación, doble eliminación con/sin reset, disputa resuelta, reportes concurrentes.
- Idempotencia: el mismo comando aplicado dos veces no duplica efectos.

Estrategia completa en [docs/TESTING_STRATEGY.md](TESTING_STRATEGY.md).
