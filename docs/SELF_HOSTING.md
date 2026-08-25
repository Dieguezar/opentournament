# Self-hosting

## 1. Requisitos

- Docker y Docker Compose v2.
- Node.js 22+ y pnpm (solo para desarrollo; no para la instalación con compose).
- Recursos: 2 vCPU, 2 GB RAM, 20 GB disco (mínimo).
- Dominio y TLS recomendados (proxy inverso) para producción.

## 2. Instalación rápida

```bash
git clone https://github.com/Dieguezar/opentournament.git
cd opentournament
cp .env.example .env
# editar .env (generar secretos con: openssl rand -hex 32)
docker compose up -d
```

1. Abrir `http://localhost:3000` (o el dominio configurado).
2. Completar el wizard de primer uso → se crea la cuenta y la primera organización.
3. Verificar health: `GET /healthz`.

### Puertos ocupados

Compose publica los servicios únicamente en `127.0.0.1` y permite cambiar cada
puerto del host desde `.env`. Los puertos internos entre contenedores no cambian.

Por ejemplo, si PostgreSQL ya usa el puerto `5432`:

```dotenv
POSTGRES_HOST_PORT=15432
```

También se pueden ajustar `MINIO_API_HOST_PORT`, `MINIO_CONSOLE_HOST_PORT`,
`API_HOST_PORT` y `WEB_HOST_PORT`. Si se cambia el puerto web o API, actualizar
también `APP_URL` o `API_URL`. Para ejecutar herramientas de desarrollo fuera de
Docker con otro puerto de PostgreSQL, actualizar además `DATABASE_URL`.

## 3. Configuración opcional

### Correo (SMTP)

- Con SMTP: verificación y recuperación de contraseña por correo.
- Sin SMTP: los correos se escriben en el log; si se desea permitir cuentas sin verificar, `ALLOW_UNVERIFIED_EMAILS=true`.

### Discord

1. Crear aplicación en el Developer Portal de Discord.
2. OAuth2 → redirect URI `${API_URL}/api/v1/auth/discord/callback` y scopes `identify email`.
3. Bot → token y permisos mínimos de mensajes.
4. Configurar `DISCORD_*` en `.env` y reiniciar.

### Almacenamiento

- Por defecto MinIO con credenciales locales (`minioadmin`).
- En producción: apuntar `S3_*` a R2 o S3.
- Crear los buckets `opentournament-public` y `opentournament-private` (o un bucket con prefijos).

## 4. Checklist de hardening

- [ ] HTTPS habilitado (Caddy/Traefik/Nginx) con redirect de HTTP.
- [ ] Secretos de `.env` únicos y largos.
- [ ] Credenciales de MinIO/PostgreSQL cambiadas.
- [ ] Puertos de postgres/minio no expuestos al exterior (red interna).
- [ ] Respaldos configurados y probados.
- [ ] Logs revisados periódicamente.
- [ ] Versión actualizada con releases de seguridad.
- [ ] `ALLOW_UNVERIFIED_EMAILS=false` en producción (salvo decisión explícita).

## 5. Respaldo y restauración

```bash
# PostgreSQL
docker compose exec postgres pg_dump -U opentournament opentournament > backup.sql

# MinIO
docker compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker compose exec minio mc mirror --overwrite local/opentournament ./backup-bucket
```

Restauración: detener servicios, restaurar el dump (`psql`), restaurar el bucket y levantar de nuevo.

## 6. Troubleshooting

| Síntoma | Causa probable | Acción |
| --- | --- | --- |
| Compose no puede publicar un puerto | El puerto ya está ocupado en el host | Cambiar el `*_HOST_PORT` correspondiente en `.env` |
| La API no arranca | `DATABASE_URL` incorrecta o postgres no listo | Revisar healthcheck y logs |
| Login con Discord falla | Redirect URI mal configurada | Verificar `DISCORD_REDIRECT_URI` |
| Subidas fallan | Bucket no creado o credenciales S3 | Crear buckets y revisar `S3_*` |
| No llegan correos | SMTP no configurado | Revisar logs; se registran en consola |
| Página pública lenta | SSR sin caché | Revisar NFR-PERF-05 y configuración de caché |

## 7. Soporte

- Issues en GitHub para bugs y dudas de instalación.
- Vulnerabilidades por la política de [SECURITY.md](../SECURITY.md).
- La comunidad mantiene guías por plataforma (VPS, Docker en NAS, etc.).
