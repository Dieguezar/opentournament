# Requisitos no funcionales

Identificadores `NFR-<categoría>-<n>`. Se verifican con las estrategias de [docs/TESTING_STRATEGY.md](TESTING_STRATEGY.md).

## Rendimiento

| ID | Requisito | Objetivo |
| --- | --- | --- |
| NFR-PERF-01 | Latencia de API (p95) | < 200 ms en operaciones comunes sin carga anómala |
| NFR-PERF-02 | Propagación de eventos SSE | < 1 s desde el cambio de estado hasta el cliente conectado |
| NFR-PERF-03 | Generación de bracket (128 participantes, doble eliminación) | < 1 s |
| NFR-PERF-04 | Carga básica | 256 participantes concurrentes con degradación aceptable; sin errores |
| NFR-PERF-05 | Página pública SSR | TTFB p95 < 500 ms en instancia modesta |

## Disponibilidad y resiliencia

| ID | Requisito |
| --- | --- |
| NFR-AVAIL-01 | La instancia debe funcionar con un solo nodo; sin puntos únicos innecesarios en el diseño |
| NFR-AVAIL-02 | Los jobs programados deben sobrevivir reinicios (cola en PostgreSQL) |
| NFR-AVAIL-03 | Health checks para web, api, postgres y minio |
| NFR-AVAIL-04 | Degradación documentada sin Redis/SMTP/Discord (funciones core intactas) |

## Seguridad

| ID | Requisito |
| --- | --- |
| NFR-SEC-01 | Contraseñas con Argon2id; sin almacenamiento de texto plano |
| NFR-SEC-02 | Sesiones con cookie httpOnly + SameSite + token CSRF |
| NFR-SEC-03 | Autorización en backend para cada recurso (nunca confiar en UI) |
| NFR-SEC-04 | Rate limiting por IP y por cuenta en rutas sensibles |
| NFR-SEC-05 | Validación y sanitización de entradas; sin SQL injection ni XSS almacenado |
| NFR-SEC-06 | Evidencias privadas por defecto; URLs firmadas con expiración |
| NFR-SEC-07 | Secretos solo vía variables de entorno; `.env.example` sin valores reales |
| NFR-SEC-08 | Escaneo de dependencias en CI (Dependabot + audit) y análisis estático (CodeQL) |
| NFR-SEC-09 | Cabeceras de seguridad (CSP, X-Content-Type-Options, Referrer-Policy, etc.) |

Ver el detalle en [docs/SECURITY_MODEL.md](SECURITY_MODEL.md).

## Escalabilidad

| ID | Requisito |
| --- | --- |
| NFR-SCALE-01 | Torneos de 512 participantes sin rediseño (índices, paginación, motor) |
| NFR-SCALE-02 | El motor es determinista y sin estado compartido entre requests |
| NFR-SCALE-03 | Evolución documentada: worker/bot extraíbles y Redis opcional |

## Accesibilidad y compatibilidad

| ID | Requisito |
| --- | --- |
| NFR-A11Y-01 | WCAG 2.1 nivel AA en todo el frontend |
| NFR-A11Y-02 | Navegación completa por teclado y foco visible |
| NFR-A11Y-03 | Regiones live para actualizaciones SSE (bracket/resultados) |
| NFR-A11Y-04 | Contraste AA, textos alternativos y formularios con labels/errores accesibles |

Ver [docs/ACCESSIBILITY.md](ACCESSIBILITY.md).

| ID | Requisito |
| --- | --- |
| NFR-COMP-01 | Navegadores: últimas 2 versiones de Chrome, Edge, Firefox y Safari |
| NFR-COMP-02 | Diseño responsive (móvil ≥ 360 px de ancho) |
| NFR-COMP-03 | PWA instalable en Chrome/Edge; instalación en iOS con limitaciones documentadas |

## Internacionalización

| ID | Requisito |
| --- | --- |
| NFR-I18N-01 | i18n con español (defecto) e inglés desde el inicio |
| NFR-I18N-02 | Sin textos hardcodeados en componentes |
| NFR-I18N-03 | Fechas, horas y zonas horarias localizadas; almacenamiento en UTC |

## Operación

| ID | Requisito |
| --- | --- |
| NFR-OPS-01 | Instalación con `docker compose up -d` siguiendo el README |
| NFR-OPS-02 | Logs estructurados (pino) con request ID |
| NFR-OPS-03 | Migraciones automáticas seguras al arrancar (o comando explícito documentado) |
| NFR-OPS-04 | Backups documentados (PostgreSQL + bucket) y procedimiento de restauración |
| NFR-OPS-05 | Actualización de versión sin pérdida de datos |

## Datos y privacidad

| ID | Requisito |
| --- | --- |
| NFR-DATA-01 | Datos sensibles identificados y cifrados en tránsito (HTTPS) y en reposo a nivel de infraestructura |
| NFR-DATA-02 | Evidencias privadas por defecto; política de retención documentada |
| NFR-DATA-03 | Exportación de datos de una organización (fase 5) y eliminación de cuenta documentadas |
| NFR-DATA-04 | Auditoría append-only de acciones críticas |

## Mantenibilidad

| ID | Requisito |
| --- | --- |
| NFR-MAINT-01 | TypeScript estricto en todo el monorepo |
| NFR-MAINT-02 | Cobertura de tests del motor ≥ 95%; API ≥ 80% de líneas críticas |
| NFR-MAINT-03 | Documentación actualizada en el mismo PR que cambia comportamiento |
| NFR-MAINT-04 | Límites de complejidad: archivos pequeños, módulos con una responsabilidad |
