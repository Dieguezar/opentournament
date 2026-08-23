'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import type { OrganizationSummary } from '@opentournament/shared-types';
import { apiClient, ApiClientError } from '@/lib/api';
import styles from '../../workspace-pages.module.css';

const GAME_OPTIONS = [
  { key: 'generic', label: 'Genérico' },
  { key: 'valorant', label: 'Valorant' },
  { key: 'cs2', label: 'Counter-Strike 2' },
  { key: 'lol', label: 'League of Legends' },
];

export default function NewTournamentPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [hasLoadedOrganizations, setHasLoadedOrganizations] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [gameAdapterKey, setGameAdapterKey] = useState('generic');
  const [format, setFormat] = useState('single_elimination');
  const [capacity, setCapacity] = useState('16');
  const [bo, setBo] = useState('3');
  const [manualApproval, setManualApproval] = useState(false);
  const [grandFinalReset, setGrandFinalReset] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
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
          settings: { grandFinalReset, presencial: false },
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

      <form className={styles.formShell} onSubmit={onSubmit}>
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
                onChange={(event) => setGameAdapterKey(event.target.value)}
              >
                {GAME_OPTIONS.map((game) => (
                  <option key={game.key} value={game.key}>
                    {game.label}
                  </option>
                ))}
              </select>
              <p className={styles.help}>Usá Genérico si el juego todavía no tiene adaptador.</p>
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
                  ? 'Cada equipo puede perder una vez antes de quedar eliminado.'
                  : 'Una derrota elimina al equipo del torneo.'}
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="capacity">Cupo de equipos</label>
              <input
                id="capacity"
                type="number"
                min={2}
                max={512}
                required
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
              />
              <p className={styles.help}>Entre 2 y 512 equipos.</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="bo">Formato de series</label>
              <select id="bo" value={bo} onChange={(event) => setBo(event.target.value)}>
                <option value="1">BO1</option>
                <option value="3">BO3</option>
                <option value="5">BO5</option>
              </select>
              <p className={styles.help}>Cantidad máxima de partidas por serie.</p>
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
