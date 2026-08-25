'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { adapters, getAdapter } from '@opentournament/game-adapters';
import type {
  GameAdapterKey,
  OrganizationSummary,
  ResultReportingMode,
} from '@opentournament/shared-types';
import { apiClient, ApiClientError } from '@/lib/api';
import {
  applyGameTemplateSelection,
  getSeriesBestOfOptions,
  parseStageList,
  restoreGameTemplateDefaults,
  validateSmashUltimateRules,
  type EditableSmashUltimateRules,
  type SmashUltimateRuleErrors,
  type SmashUltimateRuleField,
  type TournamentTemplateFormState,
} from '@/lib/tournament-template';
import styles from '../../workspace-pages.module.css';

const GAME_OPTIONS = Object.values(adapters).map((adapter) => ({
  key: adapter.key,
  label: adapter.name,
}));

const SMASH_RULE_FIELD_IDS: Record<SmashUltimateRuleField, string> = {
  stocks: 'smash-stocks',
  timeLimitMinutes: 'smash-time-limit',
  stageBans: 'smash-stage-bans',
  starters: 'smash-starters',
  counterpicks: 'smash-counterpicks',
  launchRate: 'smash-launch-rate',
};

export default function NewTournamentPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [hasLoadedOrganizations, setHasLoadedOrganizations] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [gameAdapterKey, setGameAdapterKey] = useState<GameAdapterKey>('generic');
  const [format, setFormat] = useState('single_elimination');
  const [capacity, setCapacity] = useState('16');
  const [bo, setBo] = useState('3');
  const [manualApproval, setManualApproval] = useState(false);
  const [reportingMode, setReportingMode] = useState<ResultReportingMode>('bilateral');
  const [grandFinalReset, setGrandFinalReset] = useState(false);
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [templateVersion, setTemplateVersion] = useState<number | null>(null);
  const [gameRules, setGameRules] = useState<EditableSmashUltimateRules | null>(null);
  const [ruleErrors, setRuleErrors] = useState<SmashUltimateRuleErrors>({});
  const [startsAt, setStartsAt] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const advancedRulesRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    apiClient<{ user: { organizations: OrganizationSummary[] } }>('/auth/me', {
      signal: controller.signal,
    })
      .then((data) => {
        setOrganizations(data.user.organizations);
        setOrganizationId(data.user.organizations[0]?.id ?? '');
        setHasLoadedOrganizations(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) router.push('/login');
      });

    return () => controller.abort();
  }, [router]);

  function getTemplateFormState(): TournamentTemplateFormState {
    return {
      gameAdapterKey,
      format,
      capacity,
      bo,
      grandFinalReset,
      templateKey,
      templateVersion,
      gameRules,
    };
  }

  function updateTemplateFormState(nextState: TournamentTemplateFormState) {
    setGameAdapterKey(nextState.gameAdapterKey);
    setFormat(nextState.format);
    setCapacity(nextState.capacity);
    setBo(nextState.bo);
    setGrandFinalReset(nextState.grandFinalReset);
    setTemplateKey(nextState.templateKey);
    setTemplateVersion(nextState.templateVersion);
    setGameRules(nextState.gameRules);
  }

  function selectGame(nextGameAdapterKey: GameAdapterKey) {
    const nextState = applyGameTemplateSelection(
      nextGameAdapterKey,
      getTemplateFormState(),
      getAdapter(nextGameAdapterKey).tournamentTemplate,
    );

    updateTemplateFormState(nextState);
    setRuleErrors({});
  }

  function restoreStandardTemplate() {
    const selectedTemplate = getAdapter(gameAdapterKey).tournamentTemplate;
    if (!selectedTemplate) return;

    updateTemplateFormState(restoreGameTemplateDefaults(getTemplateFormState(), selectedTemplate));
    setRuleErrors({});
    setError(null);
  }

  function clearRuleErrors(...fields: SmashUltimateRuleField[]) {
    setRuleErrors((currentErrors) =>
      fields.reduce((nextErrors, field) => ({ ...nextErrors, [field]: undefined }), currentErrors),
    );
  }

  function focusInvalidRule(field: SmashUltimateRuleField) {
    if (field === 'starters' || field === 'counterpicks' || field === 'launchRate') {
      if (advancedRulesRef.current) advancedRulesRef.current.open = true;
    }

    requestAnimationFrame(() => {
      const input = document.getElementById(SMASH_RULE_FIELD_IDS[field]);
      if (!(input instanceof HTMLElement)) return;

      input.focus({ preventScroll: true });
      input.scrollIntoView({ block: 'center' });
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const validation = gameRules ? validateSmashUltimateRules(gameRules) : null;
    if (validation) {
      setGameRules(validation.rules);
      setRuleErrors(validation.errors);
      if (validation.firstInvalidField) {
        focusInvalidRule(validation.firstInvalidField);
        return;
      }
    }

    setSubmitting(true);
    try {
      const selectedTemplate = getAdapter(gameAdapterKey).tournamentTemplate;
      const normalizedGameRules = validation?.rules ?? null;
      const result = await apiClient<{ tournament: { id: string } }>('/tournaments', {
        method: 'POST',
        body: JSON.stringify({
          organizationId,
          gameAdapterKey,
          slug,
          name,
          format,
          capacity: Number(capacity),
          seriesConfig: { bo: Number(bo), drawsAllowed: false },
          registrationConfig: { manualApproval },
          checkinConfig: templateKey ? selectedTemplate?.defaults.checkinConfig : undefined,
          settings: {
            grandFinalReset,
            reportingMode,
            presencial: templateKey
              ? (selectedTemplate?.defaults.settings.presencial ?? false)
              : false,
            ...(templateKey
              ? { templateKey, templateVersion, gameRules: normalizedGameRules }
              : {}),
          },
          startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          description: description || undefined,
          rules: rules || undefined,
        }),
      });
      router.push(`/tournaments/${result.tournament.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al crear el torneo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`container ${styles.page} ${styles.formPage}`}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Nuevo torneo</p>
          <h1>Configurá la competencia</h1>
          <p className={styles.intro}>
            Definí lo esencial ahora. Después vas a poder administrar inscripciones, check-in y
            bracket desde el workspace del torneo.
          </p>
        </div>
      </header>

      <form
        className={styles.formShell}
        data-game={gameAdapterKey}
        onInvalid={(event) => {
          const invalidField = event.target;
          if (
            invalidField instanceof HTMLElement &&
            advancedRulesRef.current?.contains(invalidField)
          ) {
            advancedRulesRef.current.open = true;
          }
        }}
        onSubmit={onSubmit}
      >
        <fieldset className={styles.formSection}>
          <legend>
            <h2>Identidad</h2>
          </legend>
          <p className={styles.sectionDescription}>
            Elegí quién organiza el torneo y cómo se mostrará públicamente.
          </p>

          {hasLoadedOrganizations && organizations.length === 0 && (
            <div className={styles.notice} role="status">
              <strong>Necesitás una organización para crear un torneo.</strong>
              <p>
                La organización define quién puede administrar la competencia y publicar sus
                resultados.
              </p>
              <Link className="button button-secondary" href="/wizard">
                Crear organización
              </Link>
            </div>
          )}

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="organizationId">Organización</label>
              <select
                id="organizationId"
                value={organizationId}
                disabled={!hasLoadedOrganizations || organizations.length === 0}
                required
                onChange={(event) => setOrganizationId(event.target.value)}
              >
                {organizations.length === 0 && (
                  <option value="">
                    {hasLoadedOrganizations ? 'Sin organizaciones' : 'Cargando organizaciones'}
                  </option>
                )}
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
              <p className={styles.help}>Será la responsable visible del torneo.</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="gameAdapterKey">Juego</label>
              <select
                id="gameAdapterKey"
                value={gameAdapterKey}
                onChange={(event) => selectGame(event.target.value as GameAdapterKey)}
              >
                {GAME_OPTIONS.map((game) => (
                  <option key={game.key} value={game.key}>
                    {game.label}
                  </option>
                ))}
              </select>
              <p className={styles.help}>
                Al elegir un juego con plantilla se aplican defaults que podés editar.
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="name">Nombre del torneo</label>
              <input
                id="name"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <p className={styles.help}>Entre 2 y 80 caracteres.</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="slug">Dirección pública</label>
              <input
                id="slug"
                required
                minLength={2}
                maxLength={40}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                aria-describedby="slug-help"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
              <p className={styles.help} id="slug-help">
                Minúsculas, números y guiones. Vista previa:
                <span className={styles.urlPreview}>/t/{slug || 'mi-torneo'}</span>
              </p>
            </div>
          </div>
        </fieldset>

        {gameRules && (
          <fieldset className={`${styles.formSection} ${styles.smashTemplate}`}>
            <legend>
              <h2>Plantilla competitiva de Smash Ultimate</h2>
            </legend>
            <p className={styles.sectionDescription}>
              Podés ajustar estas reglas según tu comunidad.
            </p>

            <div className={styles.templateLead}>
              <p>
                La configuración estándar sirve como punto de partida; tus datos de identidad no
                cambian al restaurarla.
              </p>
              <button className="button-secondary" type="button" onClick={restoreStandardTemplate}>
                Restaurar plantilla estándar
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="smash-stocks">Stocks</label>
                <input
                  id="smash-stocks"
                  type="number"
                  min={1}
                  max={10}
                  required
                  aria-describedby={
                    ruleErrors.stocks ? 'smash-stocks-help smash-stocks-error' : 'smash-stocks-help'
                  }
                  aria-invalid={Boolean(ruleErrors.stocks)}
                  value={gameRules.stocks}
                  onChange={(event) => {
                    setGameRules({ ...gameRules, stocks: Number(event.target.value) });
                    clearRuleErrors('stocks');
                  }}
                />
                <p className={styles.help} id="smash-stocks-help">
                  Vidas disponibles por juego.
                </p>
                {ruleErrors.stocks && (
                  <p className={styles.fieldError} id="smash-stocks-error" role="alert">
                    {ruleErrors.stocks}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="smash-time-limit">Tiempo límite</label>
                <input
                  id="smash-time-limit"
                  type="number"
                  min={1}
                  max={60}
                  required
                  aria-describedby={
                    ruleErrors.timeLimitMinutes
                      ? 'smash-time-limit-help smash-time-limit-error'
                      : 'smash-time-limit-help'
                  }
                  aria-invalid={Boolean(ruleErrors.timeLimitMinutes)}
                  value={gameRules.timeLimitMinutes}
                  onChange={(event) => {
                    setGameRules({ ...gameRules, timeLimitMinutes: Number(event.target.value) });
                    clearRuleErrors('timeLimitMinutes');
                  }}
                />
                <p className={styles.help} id="smash-time-limit-help">
                  Minutos por juego.
                </p>
                {ruleErrors.timeLimitMinutes && (
                  <p className={styles.fieldError} id="smash-time-limit-error" role="alert">
                    {ruleErrors.timeLimitMinutes}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="smash-stage-bans">Bans de escenarios</label>
                <input
                  id="smash-stage-bans"
                  type="number"
                  min={0}
                  max={10}
                  required
                  aria-describedby={
                    ruleErrors.stageBans
                      ? 'smash-stage-bans-help smash-stage-bans-error'
                      : 'smash-stage-bans-help'
                  }
                  aria-invalid={Boolean(ruleErrors.stageBans)}
                  value={gameRules.stageBans}
                  onChange={(event) => {
                    setGameRules({ ...gameRules, stageBans: Number(event.target.value) });
                    clearRuleErrors('stageBans');
                  }}
                />
                <p className={styles.help} id="smash-stage-bans-help">
                  Cantidad de escenarios que puede vetar el ganador.
                </p>
                {ruleErrors.stageBans && (
                  <p className={styles.fieldError} id="smash-stage-bans-error" role="alert">
                    {ruleErrors.stageBans}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="smash-stage-clause">Regla DSR</label>
                <select
                  id="smash-stage-clause"
                  value={gameRules.stageClause}
                  onChange={(event) =>
                    setGameRules({
                      ...gameRules,
                      stageClause: event.target.value as EditableSmashUltimateRules['stageClause'],
                    })
                  }
                >
                  <option value="none">Sin DSR</option>
                  <option value="modified_dsr">DSR modificado</option>
                  <option value="full_dsr">DSR completo</option>
                </select>
                <p className={styles.help}>
                  Define si se restringe volver a escenarios ya ganados.
                </p>
              </div>
            </div>

            <details className={styles.advancedRules} ref={advancedRulesRef}>
              <summary>
                <span>Escenarios y opciones avanzadas</span>
                <small>Editá pools, items, FS Meter, hazards y launch rate.</small>
              </summary>

              <div className={styles.advancedRulesContent}>
                <div className={styles.formGrid}>
                  <div className={styles.fieldWide}>
                    <label htmlFor="smash-starters">Escenarios iniciales</label>
                    <textarea
                      id="smash-starters"
                      rows={5}
                      required
                      aria-describedby={
                        ruleErrors.starters
                          ? 'smash-starters-help smash-starters-error'
                          : 'smash-starters-help'
                      }
                      aria-invalid={Boolean(ruleErrors.starters)}
                      value={gameRules.starters.join('\n')}
                      onChange={(event) => {
                        setGameRules({ ...gameRules, starters: event.target.value.split('\n') });
                        clearRuleErrors('starters', 'counterpicks', 'stageBans');
                      }}
                      onBlur={(event) =>
                        setGameRules({ ...gameRules, starters: parseStageList(event.target.value) })
                      }
                    />
                    <p className={styles.help} id="smash-starters-help">
                      Un escenario por línea. No puede repetirse en ninguno de los pools.
                    </p>
                    {ruleErrors.starters && (
                      <p className={styles.fieldError} id="smash-starters-error" role="alert">
                        {ruleErrors.starters}
                      </p>
                    )}
                  </div>

                  <div className={styles.fieldWide}>
                    <label htmlFor="smash-counterpicks">Escenarios counterpick</label>
                    <textarea
                      id="smash-counterpicks"
                      rows={4}
                      required
                      aria-describedby={
                        ruleErrors.counterpicks
                          ? 'smash-counterpicks-help smash-counterpicks-error'
                          : 'smash-counterpicks-help'
                      }
                      aria-invalid={Boolean(ruleErrors.counterpicks)}
                      value={gameRules.counterpicks.join('\n')}
                      onChange={(event) => {
                        setGameRules({
                          ...gameRules,
                          counterpicks: event.target.value.split('\n'),
                        });
                        clearRuleErrors('starters', 'counterpicks', 'stageBans');
                      }}
                      onBlur={(event) =>
                        setGameRules({
                          ...gameRules,
                          counterpicks: parseStageList(event.target.value),
                        })
                      }
                    />
                    <p className={styles.help} id="smash-counterpicks-help">
                      Un escenario por línea. No repitas escenarios iniciales.
                    </p>
                    {ruleErrors.counterpicks && (
                      <p className={styles.fieldError} id="smash-counterpicks-error" role="alert">
                        {ruleErrors.counterpicks}
                      </p>
                    )}
                  </div>
                </div>

                <div className={styles.optionStack}>
                  <label className={styles.checkboxRow} htmlFor="smash-items-enabled">
                    <input
                      id="smash-items-enabled"
                      type="checkbox"
                      checked={gameRules.itemsEnabled}
                      onChange={(event) =>
                        setGameRules({ ...gameRules, itemsEnabled: event.target.checked })
                      }
                    />
                    <span>
                      Items habilitados
                      <small>La plantilla competitiva estándar los mantiene desactivados.</small>
                    </span>
                  </label>

                  <label className={styles.checkboxRow} htmlFor="smash-fs-meter-enabled">
                    <input
                      id="smash-fs-meter-enabled"
                      type="checkbox"
                      checked={gameRules.finalSmashMeterEnabled}
                      onChange={(event) =>
                        setGameRules({
                          ...gameRules,
                          finalSmashMeterEnabled: event.target.checked,
                        })
                      }
                    />
                    <span>
                      FS Meter habilitado
                      <small>Permite cargar el medidor de Final Smash durante el juego.</small>
                    </span>
                  </label>

                  <label className={styles.checkboxRow} htmlFor="smash-hazards-enabled">
                    <input
                      id="smash-hazards-enabled"
                      type="checkbox"
                      checked={gameRules.stageHazardsEnabled}
                      onChange={(event) =>
                        setGameRules({
                          ...gameRules,
                          stageHazardsEnabled: event.target.checked,
                        })
                      }
                    />
                    <span>
                      Hazards habilitados
                      <small>Activa los elementos dinámicos propios de cada escenario.</small>
                    </span>
                  </label>
                </div>

                <div className={styles.field}>
                  <label htmlFor="smash-launch-rate">Launch rate</label>
                  <input
                    id="smash-launch-rate"
                    type="number"
                    min={0.5}
                    max={2}
                    step={0.1}
                    required
                    aria-describedby={
                      ruleErrors.launchRate
                        ? 'smash-launch-rate-help smash-launch-rate-error'
                        : 'smash-launch-rate-help'
                    }
                    aria-invalid={Boolean(ruleErrors.launchRate)}
                    value={gameRules.launchRate}
                    onChange={(event) => {
                      setGameRules({ ...gameRules, launchRate: Number(event.target.value) });
                      clearRuleErrors('launchRate');
                    }}
                  />
                  <p className={styles.help} id="smash-launch-rate-help">
                    Entre 0.5× y 2×. El valor estándar es 1×.
                  </p>
                  {ruleErrors.launchRate && (
                    <p className={styles.fieldError} id="smash-launch-rate-error" role="alert">
                      {ruleErrors.launchRate}
                    </p>
                  )}
                </div>
              </div>
            </details>
          </fieldset>
        )}

        <fieldset className={styles.formSection}>
          <legend>
            <h2>Competencia</h2>
          </legend>
          <p className={styles.sectionDescription}>
            Estos valores definen cómo se generan los cruces y las series.
          </p>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="format">Formato</label>
              <select
                id="format"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                <option value="single_elimination">Eliminación sencilla</option>
                <option value="double_elimination">Doble eliminación</option>
              </select>
              <p className={styles.help}>
                {format === 'double_elimination'
                  ? `Cada ${gameAdapterKey === 'smash_ultimate' ? 'jugador' : 'equipo'} puede perder una vez antes de quedar eliminado.`
                  : `Una derrota elimina al ${gameAdapterKey === 'smash_ultimate' ? 'jugador' : 'equipo'} del torneo.`}
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="capacity">
                Cupo de {gameAdapterKey === 'smash_ultimate' ? 'jugadores' : 'equipos'}
              </label>
              <input
                id="capacity"
                type="number"
                min={2}
                max={512}
                required
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
              />
              <p className={styles.help}>
                Entre 2 y 512 {gameAdapterKey === 'smash_ultimate' ? 'jugadores' : 'equipos'}.
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="bo">
                Formato de {gameAdapterKey === 'smash_ultimate' ? 'sets' : 'series'}
              </label>
              <select id="bo" value={bo} onChange={(event) => setBo(event.target.value)}>
                {getSeriesBestOfOptions(gameAdapterKey).map((option) => (
                  <option key={option} value={option}>
                    BO{option}
                  </option>
                ))}
              </select>
              <p className={styles.help}>
                {gameAdapterKey === 'smash_ultimate'
                  ? 'Cantidad máxima de juegos por set.'
                  : 'Cantidad máxima de partidas por serie.'}
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="startsAt">Inicio</label>
              <input
                id="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
              <p className={styles.help}>Podés definirlo más adelante si aún no está confirmado.</p>
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend>
            <h2>Inscripción</h2>
          </legend>
          <p className={styles.sectionDescription}>
            Ajustá cuánto control necesita el staff antes de armar el bracket.
          </p>
          <div className={styles.optionStack}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={manualApproval}
                onChange={(event) => setManualApproval(event.target.checked)}
              />
              <span>
                Aprobación manual de inscripciones
                <small>El staff deberá aprobar o rechazar cada solicitud.</small>
              </span>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={grandFinalReset}
                onChange={(event) => setGrandFinalReset(event.target.checked)}
              />
              <span>
                Gran final con reset
                <small>
                  Usalo en doble eliminación si el ganador del bracket inferior debe vencer dos
                  series.
                </small>
              </span>
            </label>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.fieldWide}>
              <label htmlFor="reporting-mode">Quién confirma los resultados</label>
              <select
                id="reporting-mode"
                value={reportingMode}
                onChange={(event) => setReportingMode(event.target.value as ResultReportingMode)}
              >
                <option value="bilateral">Ambos participantes confirman</option>
                <option value="winner_reports">El ganador reporta</option>
                <option value="staff_only">Sólo el staff reporta</option>
              </select>
              <p className={styles.help}>
                {reportingMode === 'bilateral'
                  ? 'Recomendado: si los dos reportes coinciden, el bracket avanza automáticamente.'
                  : reportingMode === 'winner_reports'
                    ? 'Más rápido: un solo reporte confirma el resultado, pero requiere confianza entre participantes.'
                    : 'Máximo control: participantes y capitanes no pueden cargar resultados.'}
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend>
            <h2>Detalles</h2>
          </legend>
          <p className={styles.sectionDescription}>
            Dale a los participantes el contexto necesario antes de inscribirse.
          </p>
          <div className={styles.formGrid}>
            <div className={styles.fieldWide}>
              <label htmlFor="description">Descripción</label>
              <textarea
                id="description"
                rows={3}
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <p className={styles.help}>Resumen público del torneo. Máximo 2.000 caracteres.</p>
            </div>
            <div className={styles.fieldWide}>
              <label htmlFor="rules">Reglas</label>
              <textarea
                id="rules"
                rows={7}
                maxLength={20000}
                value={rules}
                onChange={(event) => setRules(event.target.value)}
              />
              <p className={styles.help}>
                Incluí criterios de victoria, puntualidad, reportes y resolución de conflictos.
              </p>
            </div>
          </div>
        </fieldset>

        {error && (
          <p className={`error ${styles.formError}`} role="alert">
            {error}
          </p>
        )}

        <div className={styles.formActions}>
          <Link className={styles.backLink} href="/dashboard">
            Volver al panel
          </Link>
          <button
            type="submit"
            disabled={submitting || !hasLoadedOrganizations || organizations.length === 0}
          >
            {submitting ? 'Creando…' : 'Crear torneo'}
          </button>
        </div>
      </form>
    </main>
  );
}
