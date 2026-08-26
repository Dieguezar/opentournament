# Changelog

Todas las versiones notables de OpenTournament se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

## [Sin publicar]

## [1.0.0] - 2026-08-26

Primera versión estable y autoalojable de OpenTournament.

### Agregado

- Gestión completa de organizaciones, participantes y torneos de eliminación sencilla o doble.
- Inscripciones, check-in, seeds, BYEs, brackets, programación y avance automático de partidas.
- Reporte bilateral mediante pases privados revocables, evidencias, disputas y resolución auditada.
- Lectura pública sin cuenta, paneles para organización y participantes, actualizaciones SSE y PWA.
- Adaptadores genérico, Valorant, Counter-Strike 2, League of Legends y Super Smash Bros. Ultimate.
- Plantillas y reportes guiados específicos para LoL y Smash Ultimate, con demos completas de ocho participantes.
- Temas claro, oscuro y del sistema, navegación adaptable y soporte WCAG A/AA automatizado.
- Docker Compose para PostgreSQL, MinIO, API y web con datos demo opcionales.
- CI, CodeQL, Dependabot, instalación limpia, baseline OWASP ZAP y publicación semver en GHCR.
- Documentación de arquitectura, operación, contribución, seguridad y gobierno comunitario.

### Corregido

- Cabeceras globales de navegador para CSP, clickjacking, MIME sniffing, permisos y aislamiento cross-origin.
- Health checks de API y web fijados al loopback IPv4 para evitar falsos negativos en Alpine.
- Conectores visibles del bracket público y presentación consistente de estados de torneo.
- Aislamiento serial de los E2E que comparten servidor y base de datos.

### Cambiado

- Seguridad del repositorio reforzada con reportes privados, grafo de dependencias y alertas y actualizaciones de Dependabot.
- Autoalojamiento endurecido con secreto de sesión obligatorio, demo opt-in, verificación segura y health checks encadenados.
- Compose conecta SMTP, límites de evidencia, rate limiting y credenciales compartidas de MinIO con la configuración real de la API.
- La portada autenticada reemplaza los accesos de registro por acciones contextuales del organizador o participante.
