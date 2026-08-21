import Link from 'next/link';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="container">
      <div className="card">
        <h1>Revisá tu correo</h1>
        <p>
          Te enviamos un enlace de verificación{email ? ` a ${email}` : ''}. Debes abrirlo antes de
          iniciar sesión.
        </p>
        <p className="muted">El enlace vence en 24 horas.</p>
        <Link className="button" href="/login">
          Ir a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
