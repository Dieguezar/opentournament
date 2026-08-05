import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container">
      <h1>OpenTournament</h1>
      <p className="muted">
        La plataforma open source para crear, administrar y publicar torneos de esports.
      </p>
      <div className="card">
        <p>
          Crea tu organización, publica torneos, gestiona inscripciones, brackets,
          resultados y disputas. Todo autoalojable con Docker Compose.
        </p>
        <p>
          <Link className="button" href="/login">
            Iniciar sesión
          </Link>{' '}
          <Link className="button button-secondary" href="/register">
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}
