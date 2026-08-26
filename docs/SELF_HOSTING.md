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
# Generar un secreto y reemplazar SESSION_SECRET en .env
openssl rand -hex 32
docker compose up -d
```

`SESSION_SECRET` es obligatorio en Compose y la API rechaza el valor de ejemplo en producción.
Si `openssl` no está disponible, se puede generar un valor hexadecimal seguro con Docker:

```bash
docker run --rm alpine:3.22 sh -c "head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'"
```

Los contenedores usan `COMPOSE_NODE_ENV=production`. La demo y el acceso sin verificar quedan
desactivados por defecto; para una evaluación local se pueden habilitar explícitamente con
`SEED_DEMO_DATA=true` y `ALLOW_UNVERIFIED_EMAILS=true`.

`DATABASE_URL` y `S3_ENDPOINT` se usan desde el host durante desarrollo. Sus variantes
`DATABASE_URL_DOCKER` y `S3_ENDPOINT_DOCKER` se usan dentro de Compose, donde los hosts son
`postgres` y `minio`. Si se cambia la contraseña interna de PostgreSQL, también debe actualizarse
`DATABASE_URL_DOCKER`; se recomienda usar un valor hexadecimal para evitar caracteres que deban
escaparse dentro de una URL.

1. Abrir `http://localhost:3000` (o el dominio configurado).
2. Completar el wizard de primer uso → se crea la cuenta y la primera organización.
3. Verificar health: `GET /healthz`.

Sin SMTP, la API escribe el enlace de verificación en sus logs. Se puede consultar con
`docker compose logs api`; no es necesario habilitar cuentas sin verificar en una instancia
pública.

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
- Compose reenvía todas las variables `SMTP_*` a la API.
- Sin SMTP: los correos se escriben en el log; si se desea permitir cuentas sin verificar en una
  instalación privada, `ALLOW_UNVERIFIED_EMAILS=true`.

### Discord

1. Crear aplicación en el Developer Portal de Discord.
2. OAuth2 → redirect URI `${API_URL}/api/v1/auth/discord/callback` y scopes `identify email`.
3. Bot → token y permisos mínimos de mensajes.
4. Configurar `DISCORD_*` en `.env` y reiniciar.

### Almacenamiento

- Por defecto MinIO con credenciales locales (`minioadmin`).
- `S3_ACCESS_KEY` y `S3_SECRET_KEY` configuran tanto MinIO como el cliente de la API, por lo que
  deben cambiarse juntas antes de exponer la instancia.
- En producción: apuntar `S3_*` a R2 o S3.
- El bucket configurado por `S3_BUCKET` usa prefijos públicos/privados.

## 4. Checklist de hardening

- [ ] HTTPS habilitado (Caddy/Traefik/Nginx) con redirect de HTTP.
- [ ] Secretos de `.env` únicos y largos.
- [ ] `COMPOSE_NODE_ENV=production` y `SEED_DEMO_DATA=false`.
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

| Síntoma                             | Causa probable                                | Acción                                                         |
| ----------------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| Compose no puede publicar un puerto | El puerto ya está ocupado en el host          | Cambiar el `*_HOST_PORT` correspondiente en `.env`             |
| La API no arranca                   | `DATABASE_URL` incorrecta o postgres no listo | Revisar healthcheck y logs                                     |
| La API rechaza `SESSION_SECRET`     | Se conservó el valor de ejemplo               | Generar un secreto hexadecimal de 32 bytes y actualizar `.env` |
| Login con Discord falla             | Redirect URI mal configurada                  | Verificar `DISCORD_REDIRECT_URI`                               |
| Subidas fallan                      | Bucket no creado o credenciales S3            | Crear buckets y revisar `S3_*`                                 |
| No llegan correos                   | SMTP no configurado                           | Revisar logs; se registran en consola                          |
| Página pública lenta                | SSR sin caché                                 | Revisar NFR-PERF-05 y configuración de caché                   |

## 7. Soporte

- Issues en GitHub para bugs y dudas de instalación.
- Vulnerabilidades por la política de [SECURITY.md](../SECURITY.md).
- La comunidad mantiene guías por plataforma (VPS, Docker en NAS, etc.).
