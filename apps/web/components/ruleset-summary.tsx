import type { TournamentSettings } from '@opentournament/shared-types';
import { DEFAULT_LOCALE, getDictionary, type Locale } from '@/lib/i18n';
import { buildRulesetSummary } from '@/lib/presentation';
import styles from './ruleset-summary.module.css';

interface RulesetSummaryProps {
  gameAdapterKey: string;
  format: string;
  seriesBestOf: number;
  settings: TournamentSettings | null | undefined;
  locale?: Locale;
}

export function RulesetSummary({
  gameAdapterKey,
  format,
  seriesBestOf,
  settings,
  locale,
}: RulesetSummaryProps) {
  const resolvedLocale = locale ?? DEFAULT_LOCALE;
  const copy = getDictionary(resolvedLocale).publicTournament;
  const summary = buildRulesetSummary(
    {
      gameAdapterKey,
      format,
      seriesBestOf,
      grandFinalReset: settings?.grandFinalReset ?? false,
      gameRules: settings?.gameRules,
    },
    resolvedLocale,
  );

  if (!summary) return null;

  if (summary.kind === 'lol') {
    return (
      <section className={styles.summary} data-game="lol" aria-label={summary.title}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>{copy.gameTemplate}</p>
            <h2>{summary.title}</h2>
          </div>
          <p className={styles.switches}>{summary.draft}</p>
        </header>

        <dl className={styles.facts}>
          <div>
            <dt>{copy.format}</dt>
            <dd>{summary.format}</dd>
          </div>
          <div>
            <dt>{copy.series}</dt>
            <dd>{summary.set}</dd>
          </div>
          <div>
            <dt>{copy.patchAndRegion}</dt>
            <dd>{summary.patch}</dd>
          </div>
          <div>
            <dt>{copy.sideSelection}</dt>
            <dd>{summary.sideSelection}</dd>
          </div>
        </dl>

        <p className={styles.switches}>{summary.operations}</p>
      </section>
    );
  }

  return (
    <section className={styles.summary} data-game="smash_ultimate" aria-label={summary.title}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{copy.gameTemplate}</p>
          <h2>{summary.title}</h2>
        </div>
        <p className={styles.switches}>{summary.switches}</p>
      </header>

      <dl className={styles.facts}>
        <div>
          <dt>{copy.format}</dt>
          <dd>{summary.format}</dd>
        </div>
        <div>
          <dt>{copy.set}</dt>
          <dd>{summary.set}</dd>
        </div>
        <div>
          <dt>{copy.grandFinal}</dt>
          <dd>{summary.grandFinal}</dd>
        </div>
        <div>
          <dt>{copy.stageSelection}</dt>
          <dd>{summary.stagePolicy}</dd>
        </div>
      </dl>

      <div className={styles.stageGroups}>
        <div>
          <h3>{copy.starterStages}</h3>
          <ul>
            {summary.starters.map((stage) => (
              <li key={stage}>{stage}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>{copy.counterpicks}</h3>
          <ul>
            {summary.counterpicks.map((stage) => (
              <li key={stage}>{stage}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
