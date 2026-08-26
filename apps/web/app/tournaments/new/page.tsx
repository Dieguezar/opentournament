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
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';
import { formatMessage } from '@/lib/i18n';
import { formatGameAdapter } from '@/lib/presentation';
import {
  applyGameTemplateSelection,
  getSeriesBestOfOptions,
  parseStageList,
  restoreGameTemplateDefaults,
  validateLeagueOfLegendsRules,
  validateSmashUltimateRules,
  type EditableLeagueOfLegendsRules,
  type EditableSmashUltimateRules,
  type LeagueOfLegendsRuleErrors,
  type LeagueOfLegendsRuleField,
  type SmashUltimateRuleErrors,
  type SmashUltimateRuleField,
  type TournamentTemplateFormState,
} from '@/lib/tournament-template';
import styles from '../../workspace-pages.module.css';

const GAME_OPTIONS = Object.values(adapters).map((adapter) => ({
  key: adapter.key,
}));

const SMASH_RULE_FIELD_IDS: Record<SmashUltimateRuleField, string> = {
  stocks: 'smash-stocks',
  timeLimitMinutes: 'smash-time-limit',
  stageBans: 'smash-stage-bans',
  starters: 'smash-starters',
  counterpicks: 'smash-counterpicks',
  launchRate: 'smash-launch-rate',
};

const LOL_RULE_FIELD_IDS: Record<LeagueOfLegendsRuleField, string> = {
  patchVersion: 'lol-patch-version',
  pauseBudgetMinutes: 'lol-pause-budget',
  spectatorDelayMinutes: 'lol-spectator-delay',
};

export default function NewTournamentPage() {
  const router = useRouter();
  const { dictionary, locale } = useI18n();
  const copy = dictionary.newTournament;
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
  const [gameRules, setGameRules] = useState<TournamentTemplateFormState['gameRules']>(null);
  const [ruleErrors, setRuleErrors] = useState<SmashUltimateRuleErrors>({});
  const [leagueRuleErrors, setLeagueRuleErrors] = useState<LeagueOfLegendsRuleErrors>({});
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
    setLeagueRuleErrors({});
  }

  function restoreStandardTemplate() {
    const selectedTemplate = getAdapter(gameAdapterKey).tournamentTemplate;
    if (!selectedTemplate) return;

    updateTemplateFormState(restoreGameTemplateDefaults(getTemplateFormState(), selectedTemplate));
    setRuleErrors({});
    setLeagueRuleErrors({});
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

  function clearLeagueRuleErrors(...fields: LeagueOfLegendsRuleField[]) {
    setLeagueRuleErrors((currentErrors) =>
      fields.reduce((nextErrors, field) => ({ ...nextErrors, [field]: undefined }), currentErrors),
    );
  }

  function focusInvalidLeagueRule(field: LeagueOfLegendsRuleField) {
    requestAnimationFrame(() => {
      const input = document.getElementById(LOL_RULE_FIELD_IDS[field]);
      if (!(input instanceof HTMLElement)) return;
      input.focus({ preventScroll: true });
      input.scrollIntoView({ block: 'center' });
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const smashValidation =
      gameRules?.game === 'smash_ultimate' ? validateSmashUltimateRules(gameRules, locale) : null;
    if (smashValidation) {
      setGameRules(smashValidation.rules);
      setRuleErrors(smashValidation.errors);
      if (smashValidation.firstInvalidField) {
        focusInvalidRule(smashValidation.firstInvalidField);
        return;
      }
    }
    const leagueValidation =
      gameRules?.game === 'lol' ? validateLeagueOfLegendsRules(gameRules, locale) : null;
    if (leagueValidation) {
      setGameRules(leagueValidation.rules);
      setLeagueRuleErrors(leagueValidation.errors);
      if (leagueValidation.firstInvalidField) {
        focusInvalidLeagueRule(leagueValidation.firstInvalidField);
        return;
      }
    }

    setSubmitting(true);
    try {
      const selectedTemplate = getAdapter(gameAdapterKey).tournamentTemplate;
      const normalizedGameRules = smashValidation?.rules ?? leagueValidation?.rules ?? null;
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
      setError(err instanceof ApiClientError ? err.message : copy.createError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`container ${styles.page} ${styles.formPage}`}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className={styles.intro}>{copy.intro}</p>
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
            <h2>{copy.identityTitle}</h2>
          </legend>
          <p className={styles.sectionDescription}>{copy.identityDescription}</p>

          {hasLoadedOrganizations && organizations.length === 0 && (
            <div className={styles.notice} role="status">
              <strong>{copy.organizationRequired}</strong>
              <p>{copy.organizationRequiredDescription}</p>
              <Link className="button button-secondary" href="/wizard">
                {copy.createOrganization}
              </Link>
            </div>
          )}

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="organizationId">{copy.organization}</label>
              <select
                id="organizationId"
                value={organizationId}
                disabled={!hasLoadedOrganizations || organizations.length === 0}
                required
                onChange={(event) => setOrganizationId(event.target.value)}
              >
                {organizations.length === 0 && (
                  <option value="">
                    {hasLoadedOrganizations ? copy.noOrganizations : copy.loadingOrganizations}
                  </option>
                )}
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
              <p className={styles.help}>{copy.organizationHelp}</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="gameAdapterKey">{copy.game}</label>
              <select
                id="gameAdapterKey"
                value={gameAdapterKey}
                onChange={(event) => selectGame(event.target.value as GameAdapterKey)}
              >
                {GAME_OPTIONS.map((game) => (
                  <option key={game.key} value={game.key}>
                    {formatGameAdapter(game.key, locale)}
                  </option>
                ))}
              </select>
              <p className={styles.help}>{copy.gameHelp}</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="name">{copy.tournamentName}</label>
              <input
                id="name"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <p className={styles.help}>{copy.tournamentNameHelp}</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="slug">{copy.publicAddress}</label>
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
                {copy.publicAddressHelp}
                <span className={styles.urlPreview}>/t/{slug || copy.slugExample}</span>
              </p>
            </div>
          </div>
        </fieldset>

        {gameRules?.game === 'smash_ultimate' && (
          <fieldset className={`${styles.formSection} ${styles.smashTemplate}`}>
            <legend>
              <h2>{copy.smashTitle}</h2>
            </legend>
            <p className={styles.sectionDescription}>{copy.smashDescription}</p>

            <div className={styles.templateLead}>
              <p>{copy.smashTemplateLead}</p>
              <button className="button-secondary" type="button" onClick={restoreStandardTemplate}>
                {copy.restoreTemplate}
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="smash-stocks">{copy.stocks}</label>
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
                  {copy.stocksHelp}
                </p>
                {ruleErrors.stocks && (
                  <p className={styles.fieldError} id="smash-stocks-error" role="alert">
                    {ruleErrors.stocks}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="smash-time-limit">{copy.timeLimit}</label>
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
                  {copy.timeLimitHelp}
                </p>
                {ruleErrors.timeLimitMinutes && (
                  <p className={styles.fieldError} id="smash-time-limit-error" role="alert">
                    {ruleErrors.timeLimitMinutes}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="smash-stage-bans">{copy.stageBans}</label>
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
                  {copy.stageBansHelp}
                </p>
                {ruleErrors.stageBans && (
                  <p className={styles.fieldError} id="smash-stage-bans-error" role="alert">
                    {ruleErrors.stageBans}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="smash-stage-clause">{copy.dsrRule}</label>
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
                  <option value="none">{copy.noDsr}</option>
                  <option value="modified_dsr">{copy.modifiedDsr}</option>
                  <option value="full_dsr">{copy.fullDsr}</option>
                </select>
                <p className={styles.help}>{copy.dsrHelp}</p>
              </div>
            </div>

            <details className={styles.advancedRules} ref={advancedRulesRef}>
              <summary>
                <span>{copy.advancedRules}</span>
                <small>{copy.advancedRulesHelp}</small>
              </summary>

              <div className={styles.advancedRulesContent}>
                <div className={styles.formGrid}>
                  <div className={styles.fieldWide}>
                    <label htmlFor="smash-starters">{copy.starterStages}</label>
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
                      {copy.starterStagesHelp}
                    </p>
                    {ruleErrors.starters && (
                      <p className={styles.fieldError} id="smash-starters-error" role="alert">
                        {ruleErrors.starters}
                      </p>
                    )}
                  </div>

                  <div className={styles.fieldWide}>
                    <label htmlFor="smash-counterpicks">{copy.counterpickStages}</label>
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
                      {copy.counterpickStagesHelp}
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
                      {copy.itemsEnabled}
                      <small>{copy.itemsHelp}</small>
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
                      {copy.fsMeterEnabled}
                      <small>{copy.fsMeterHelp}</small>
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
                      {copy.hazardsEnabled}
                      <small>{copy.hazardsHelp}</small>
                    </span>
                  </label>
                </div>

                <div className={styles.field}>
                  <label htmlFor="smash-launch-rate">{copy.launchRate}</label>
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
                    {copy.launchRateHelp}
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

        {gameRules?.game === 'lol' && (
          <fieldset className={`${styles.formSection} ${styles.smashTemplate}`}>
            <legend>
              <h2>{copy.lolTitle}</h2>
            </legend>
            <p className={styles.sectionDescription}>{copy.lolDescription}</p>

            <div className={styles.templateLead}>
              <p>{copy.lolTemplateLead}</p>
              <button className="button-secondary" type="button" onClick={restoreStandardTemplate}>
                {copy.restoreTemplate}
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="lol-region">{copy.region}</label>
                <select
                  id="lol-region"
                  value={gameRules.region}
                  onChange={(event) =>
                    setGameRules({
                      ...gameRules,
                      region: event.target.value as EditableLeagueOfLegendsRules['region'],
                    })
                  }
                >
                  {getAdapter('lol').regions?.map((region) => (
                    <option key={region} value={region}>
                      {region.toUpperCase()}
                    </option>
                  ))}
                </select>
                <p className={styles.help}>{copy.regionHelp}</p>
              </div>

              <div className={styles.field}>
                <label htmlFor="lol-map">{copy.map}</label>
                <input id="lol-map" value="Summoner’s Rift" readOnly />
                <p className={styles.help}>{copy.mapHelp}</p>
              </div>

              <div className={styles.field}>
                <label htmlFor="lol-patch-policy">{copy.patchPolicy}</label>
                <select
                  id="lol-patch-policy"
                  value={gameRules.patchPolicy}
                  onChange={(event) => {
                    const patchPolicy = event.target
                      .value as EditableLeagueOfLegendsRules['patchPolicy'];
                    setGameRules({
                      ...gameRules,
                      patchPolicy,
                      patchVersion: patchPolicy === 'live' ? null : gameRules.patchVersion,
                    });
                    clearLeagueRuleErrors('patchVersion');
                  }}
                >
                  <option value="live">{copy.livePatch}</option>
                  <option value="fixed">{copy.fixedPatch}</option>
                </select>
                <p className={styles.help}>{copy.patchPolicyHelp}</p>
              </div>

              {gameRules.patchPolicy === 'fixed' && (
                <div className={styles.field}>
                  <label htmlFor="lol-patch-version">{copy.patchVersion}</label>
                  <input
                    id="lol-patch-version"
                    required
                    placeholder="26.16"
                    pattern="[0-9]{1,2}\.[0-9]{1,2}"
                    aria-invalid={Boolean(leagueRuleErrors.patchVersion)}
                    aria-describedby={
                      leagueRuleErrors.patchVersion ? 'lol-patch-version-error' : undefined
                    }
                    value={gameRules.patchVersion ?? ''}
                    onChange={(event) => {
                      setGameRules({ ...gameRules, patchVersion: event.target.value });
                      clearLeagueRuleErrors('patchVersion');
                    }}
                  />
                  {leagueRuleErrors.patchVersion && (
                    <p className={styles.fieldError} id="lol-patch-version-error" role="alert">
                      {leagueRuleErrors.patchVersion}
                    </p>
                  )}
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="lol-side-selection">{copy.sideSelection}</label>
                <select
                  id="lol-side-selection"
                  value={gameRules.sideSelection}
                  onChange={(event) =>
                    setGameRules({
                      ...gameRules,
                      sideSelection: event.target
                        .value as EditableLeagueOfLegendsRules['sideSelection'],
                    })
                  }
                >
                  <option value="higher_seed_game_1_then_loser">{copy.higherSeedThenLoser}</option>
                  <option value="alternating">{copy.alternatingSides}</option>
                  <option value="coin_toss">{copy.coinToss}</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="lol-pause-budget">{copy.pauseBudget}</label>
                <input
                  id="lol-pause-budget"
                  type="number"
                  min={0}
                  max={120}
                  required
                  aria-invalid={Boolean(leagueRuleErrors.pauseBudgetMinutes)}
                  aria-describedby={
                    leagueRuleErrors.pauseBudgetMinutes ? 'lol-pause-budget-error' : undefined
                  }
                  value={gameRules.pauseBudgetMinutes}
                  onChange={(event) => {
                    setGameRules({ ...gameRules, pauseBudgetMinutes: Number(event.target.value) });
                    clearLeagueRuleErrors('pauseBudgetMinutes');
                  }}
                />
                <p className={styles.help}>{copy.pauseBudgetHelp}</p>
                {leagueRuleErrors.pauseBudgetMinutes && (
                  <p className={styles.fieldError} id="lol-pause-budget-error" role="alert">
                    {leagueRuleErrors.pauseBudgetMinutes}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="lol-spectator-delay">{copy.spectatorDelay}</label>
                <input
                  id="lol-spectator-delay"
                  type="number"
                  min={0}
                  max={30}
                  required
                  aria-invalid={Boolean(leagueRuleErrors.spectatorDelayMinutes)}
                  aria-describedby={
                    leagueRuleErrors.spectatorDelayMinutes ? 'lol-spectator-delay-error' : undefined
                  }
                  value={gameRules.spectatorDelayMinutes}
                  onChange={(event) => {
                    setGameRules({
                      ...gameRules,
                      spectatorDelayMinutes: Number(event.target.value),
                    });
                    clearLeagueRuleErrors('spectatorDelayMinutes');
                  }}
                />
                <p className={styles.help}>{copy.spectatorDelayHelp}</p>
                {leagueRuleErrors.spectatorDelayMinutes && (
                  <p className={styles.fieldError} id="lol-spectator-delay-error" role="alert">
                    {leagueRuleErrors.spectatorDelayMinutes}
                  </p>
                )}
              </div>
            </div>

            <label className={styles.checkboxRow} htmlFor="lol-fearless-draft">
              <input
                id="lol-fearless-draft"
                type="checkbox"
                checked={gameRules.fearlessDraft}
                onChange={(event) =>
                  setGameRules({ ...gameRules, fearlessDraft: event.target.checked })
                }
              />
              <span>
                {copy.fearlessDraft}
                <small>{copy.fearlessDraftHelp}</small>
              </span>
            </label>
          </fieldset>
        )}

        <fieldset className={styles.formSection}>
          <legend>
            <h2>{copy.competitionTitle}</h2>
          </legend>
          <p className={styles.sectionDescription}>{copy.competitionDescription}</p>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="format">{copy.format}</label>
              <select
                id="format"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                <option value="single_elimination">{copy.singleElimination}</option>
                <option value="double_elimination">{copy.doubleElimination}</option>
              </select>
              <p className={styles.help}>
                {format === 'double_elimination'
                  ? formatMessage(copy.doubleEliminationHelp, {
                      entry: gameAdapterKey === 'smash_ultimate' ? copy.player : copy.team,
                    })
                  : formatMessage(copy.singleEliminationHelp, {
                      entry: gameAdapterKey === 'smash_ultimate' ? copy.player : copy.team,
                    })}
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="capacity">
                {formatMessage(copy.capacity, {
                  entries: gameAdapterKey === 'smash_ultimate' ? copy.players : copy.teams,
                })}
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
                {formatMessage(copy.capacityHelp, {
                  entries: gameAdapterKey === 'smash_ultimate' ? copy.players : copy.teams,
                })}
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="bo">
                {gameAdapterKey === 'smash_ultimate' ? copy.setFormat : copy.seriesFormat}
              </label>
              <select id="bo" value={bo} onChange={(event) => setBo(event.target.value)}>
                {getSeriesBestOfOptions(gameAdapterKey).map((option) => (
                  <option key={option} value={option}>
                    BO{option}
                  </option>
                ))}
              </select>
              <p className={styles.help}>
                {gameAdapterKey === 'smash_ultimate' ? copy.maxGamesPerSet : copy.maxGamesPerSeries}
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="startsAt">{copy.startsAt}</label>
              <input
                id="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
              <p className={styles.help}>{copy.startsAtHelp}</p>
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend>
            <h2>{copy.registrationTitle}</h2>
          </legend>
          <p className={styles.sectionDescription}>{copy.registrationDescription}</p>
          <div className={styles.optionStack}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={manualApproval}
                onChange={(event) => setManualApproval(event.target.checked)}
              />
              <span>
                {copy.manualApproval}
                <small>{copy.manualApprovalHelp}</small>
              </span>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={grandFinalReset}
                onChange={(event) => setGrandFinalReset(event.target.checked)}
              />
              <span>
                {copy.grandFinalReset}
                <small>{copy.grandFinalResetHelp}</small>
              </span>
            </label>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.fieldWide}>
              <label htmlFor="reporting-mode">{copy.reportingMode}</label>
              <select
                id="reporting-mode"
                value={reportingMode}
                onChange={(event) => setReportingMode(event.target.value as ResultReportingMode)}
              >
                <option value="bilateral">{copy.bilateral}</option>
                <option value="winner_reports">{copy.winnerReports}</option>
                <option value="staff_only">{copy.staffOnly}</option>
              </select>
              <p className={styles.help}>
                {reportingMode === 'bilateral'
                  ? copy.bilateralHelp
                  : reportingMode === 'winner_reports'
                    ? copy.winnerReportsHelp
                    : copy.staffOnlyHelp}
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend>
            <h2>{copy.detailsTitle}</h2>
          </legend>
          <p className={styles.sectionDescription}>{copy.detailsDescription}</p>
          <div className={styles.formGrid}>
            <div className={styles.fieldWide}>
              <label htmlFor="description">{copy.description}</label>
              <textarea
                id="description"
                rows={3}
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <p className={styles.help}>{copy.descriptionHelp}</p>
            </div>
            <div className={styles.fieldWide}>
              <label htmlFor="rules">{copy.rules}</label>
              <textarea
                id="rules"
                rows={7}
                maxLength={20000}
                value={rules}
                onChange={(event) => setRules(event.target.value)}
              />
              <p className={styles.help}>{copy.rulesHelp}</p>
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
            {copy.backDashboard}
          </Link>
          <button
            type="submit"
            disabled={submitting || !hasLoadedOrganizations || organizations.length === 0}
          >
            {submitting ? copy.creating : copy.create}
          </button>
        </div>
      </form>
    </main>
  );
}
