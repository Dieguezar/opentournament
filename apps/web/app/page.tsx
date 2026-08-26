import Link from 'next/link';
import { getAuthSession } from '@/lib/auth-session';
import { getHomePresentation } from '@/lib/participant-experience';

export default async function HomePage() {
  const { status, data } = await getAuthSession();
  const user = status === 200 ? data.user : null;
  const presentation = user
    ? getHomePresentation({ user, participantAccess: data.participantAccess ?? null })
    : null;

  return (
    <main className="container">
      <h1>OpenTournament</h1>
      <p className="muted">
        La plataforma open source para crear, administrar y publicar torneos de esports.
      </p>
      <div className="card">
        {presentation ? (
          <>
            <p className="eyebrow">{presentation.eyebrow}</p>
            <h2>{presentation.title}</h2>
            <p>{presentation.description}</p>
            <div className="actions">
              <Link className="button" href={presentation.primaryAction.href}>
                {presentation.primaryAction.label}
              </Link>
              <Link
                className="button button-secondary"
                href={presentation.secondaryAction.href}
              >
                {presentation.secondaryAction.label}
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2>Tu servidor, tus reglas</h2>
            <p>
              Creá tu organización, publicá torneos, gestioná inscripciones, brackets,
              resultados y disputas. Todo autoalojable con Docker Compose.
            </p>
            <div className="actions">
              <Link className="button" href="/login">
                Iniciar sesión
              </Link>
              <Link className="button button-secondary" href="/register">
                Crear cuenta
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
