# Changelog

Todas las versiones notables de OpenTournament se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

## [Sin publicar]

### Corregido

- Health checks de API y web fijados al loopback IPv4 para evitar falsos negativos en Alpine.

### Cambiado

- Autoalojamiento endurecido con secreto de sesión obligatorio, demo opt-in, verificación segura y health checks encadenados.
- Compose conecta SMTP, límites de evidencia, rate limiting y credenciales compartidas de MinIO con la configuración real de la API.

### Agregado

- Workflow manual para validar una instalación limpia y completa con Docker Compose.
- Plantilla competitiva `lol.standard_v1` con región, política de parche, Tournament/Fearless Draft, selección de lado, pausas y retraso de espectadores.
- Reporte guiado de series de League of Legends con detalle por partida y validación bilateral.
- Demo pública `Liga Nexo LoL` con ocho equipos y bracket completo.
- Fase 0 completada: visión de producto, PRD, alcance del MVP, arquitectura, modelo de datos, diseño de API, modelo de autorización, motor de torneos, adaptadores de juegos, integración con Discord, estrategia de almacenamiento, modelo de seguridad, despliegue, self-hosting, estrategia de pruebas, observabilidad, accesibilidad, roadmap, backlog, riesgos, decisiones y glosario.
- Documentación de contribución, código de conducta, política de seguridad y plantillas de issues/PR.
