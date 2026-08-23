import type { TournamentSettings } from '@opentournament/shared-types';
import { buildRulesetSummary } from '@/lib/presentation';
import styles from './ruleset-summary.module.css';

interface RulesetSummaryProps {
  gameAdapterKey: string;
  format: string;
  seriesBestOf: number;
  settings: TournamentSettings | null | undefined;
}

export function RulesetSummary({
  gameAdapterKey,
  format,
  seriesBestOf,
  settings,
}: RulesetSummaryProps) {
  const summary = buildRulesetSummary({
    gameAdapterKey,
    format,
    seriesBestOf,
    grandFinalReset: settings?.grandFinalReset ?? false,
    gameRules: settings?.gameRules,
  });

  if (!summary) return null;

  return (
    <section className={styles.summary} data-game="smash_ultimate" aria-label={summary.title}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Plantilla del juego</p>
          <h2>{summary.title}</h2>
        </div>
        <p className={styles.switches}>{summary.switches}</p>
      </header>

      <dl className={styles.facts}>
        <div>
          <dt>Formato</dt>
          <dd>{summary.format}</dd>
        </div>
        <div>
          <dt>Set</dt>
          <dd>{summary.set}</dd>
        </div>
        <div>
          <dt>Gran final</dt>
          <dd>{summary.grandFinal}</dd>
        </div>
        <div>
          <dt>Selección de escenario</dt>
          <dd>{summary.stagePolicy}</dd>
        </div>
      </dl>

      <div className={styles.stageGroups}>
        <div>
          <h3>Escenarios iniciales</h3>
          <ul>
            {summary.starters.map((stage) => (
              <li key={stage}>{stage}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Counterpicks</h3>
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
