# Modelo de seguridad

## 1. Principios

- Seguridad desde el diseño (threat modeling en la especificación).
- Autorización en backend; validación en cliente y servidor.
- Privilegio mínimo; fail-closed.
- Secretos fuera del repositorio; `.env.example` sin valores reales.
- Datos sensibles identificados y tratados por separado.

## 2. Modelo de amenazas

Clasificación: Impacto (A=alto, M=medio, B=bajo) × Probabilidad (A=alta, M=media, B=baja).

| Amenaza | Impacto | Prob. | Controles |
| --- | --- | --- | --- |
| Escalamiento de privilegios | A | M | RBAC por roles, validación de rol efectivo, rutas de roles protegidas, audit log |
| Acceso entre organizaciones (IDOR) | A | M | Filtro `organization_id` + membresía en cada query; tests de autorización |
| Alteración de resultados | A | M | Reporte bilateral, confirmación automática, optimistic locking, inmutabilidad + corrección auditada |
| Suplantación de jugadores | A | M | Cuentas verificadas, IDs de juego por adaptador, perfiles públicos, auditoría de cambios de roster |
| Manipulación de brackets | A | B | Motor determinista, solo admin genera/regenera, eventos de dominio |
| Spam y bots | M | A | Rate limiting por IP/cuenta, validación de correo, captcha diferido |
| Archivos maliciosos | A | B | Presign, tipos permitidos, verificación de MIME/tamaño, servir con attachment |
| Evidencias privadas filtradas | A | M | Bucket privado, URLs firmadas, `evidence.view` + alcance, sin exposición en respuestas públicas |
| Webhooks falsificados | A | B | Diferidos; cuando existan: firma HMAC + replay protection (documentado) |
| Robo de sesiones | A | M | Cookie httpOnly + SameSite, expiración, revocación, token CSRF, rate limiting |
| CSRF | M | M | Token CSRF en mutaciones; SameSite=Lax |
| XSS | A | M | Escapado de React/Next, sanitización de rich text, CSP |
| SQL injection | A | B | Drizzle parametrizado; prohibido SQL interpolado |
| Rate limit bypass / abuso de endpoints públicos | M | M | Rate limiting global y por ruta, paginación acotada, caché de SSR |
| Fuga de secretos | A | M | .env fuera de git, auditoría de secretos en CI, rotación documentada |
| Configuración insegura en autoalojados | A | M | Checklist de hardening en SELF_HOSTING, defaults seguros, documentación |

## 3. Controles por capa

### 3.1 Transporte y cabeceras

- HTTPS obligatorio en producción (proxy inverso).
- Cabeceras: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`.
- HSTS en producción.

### 3.2 Autenticación

- Contraseñas Argon2id (19 MiB, 2 iteraciones, 1 hilo).
- Verificación de correo (si SMTP); sin SMTP, `ALLOW_UNVERIFIED_EMAILS` explícito.
- Sesiones: cookie `HttpOnly`, `Secure`, `SameSite=Lax`; sesión almacenada con hash; expiración 7 días por defecto.
- Discord OAuth con `state` (CSRF de OAuth) y verificación de correo para vinculación.

### 3.3 Autorización

- Catálogo de permisos y enforcement centralizado ([AUTHORIZATION_MODEL.md](AUTHORIZATION_MODEL.md)).
- Pruebas automáticas de IDOR en cada recurso.

### 3.4 Validación

- Zod en el borde de la API y en la UI; mensajes de error sin detalles internos.
- Rich text de reglas: sanitización en servidor (allowlist de HTML).
- Paginación y límites de tamaño de cuerpo.

### 3.5 Rate limiting

- Global por IP (300 req/min por defecto).
- Estricto en auth (login/registro/recuperación): 5–10 intentos/min por cuenta/IP.
- Por usuario autenticado en rutas de escritura sensibles.

### 3.6 Archivos

- Presign con expiración corta; validación de tipo/tamaño antes y después de subir.
- Evidencias privadas; avatares/logos públicos sanitizados (sin HTML/SVG).

### 3.7 Dependencias y CI

- `pnpm audit` en CI; Dependabot para actualizaciones.
- CodeQL (JavaScript/TypeScript) en CI.
- Revisión manual de dependencias nuevas (PR checklist).

## 4. Datos sensibles

| Dato | Tratamiento |
| --- | --- |
| Contraseñas | Hash Argon2id; nunca en logs |
| Sesiones | Hash en base; cookie firmada |
| Tokens OAuth (Discord) | Cifrados con clave de instancia |
| Evidencias | Bucket privado + URLs firmadas |
| Correos | Solo los necesarios; no en logs (pino redacta) |

## 5. Auditoría y respuesta

- Audit log append-only (acciones críticas).
- Plan de respuesta a incidentes documentado en [SECURITY.md](../SECURITY.md) (divulgación responsable).

## 6. Pruebas de seguridad

- Tests automatizados de autorización (IDOR, escalamiento) en integración.
- Escaneo estático en CI.
- Pruebas manuales pre-release: sesión, CSRF, subida de archivos, cabeceras.
- Pentest/OWASP ZAP diferido a fase 5 (documentado en riesgos).
