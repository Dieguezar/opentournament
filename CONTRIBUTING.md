# Guía de contribución

¡Gracias por querer contribuir a OpenTournament! Esta guía define cómo participar de forma efectiva y consistente. Antes de contribuir, lee el [Código de Conducta](CODE_OF_CONDUCT.md).

## Formas de contribuir

- Reportar bugs o problemas de seguridad (ver [SECURITY.md](SECURITY.md) para vulnerabilidades).
- Proponer mejoras o funcionalidades nuevas mediante issues.
- Escribir o corregir documentación.
- Implementar historias del [backlog](docs/BACKLOG.md).
- Crear o mejorar [adaptadores de juegos](docs/GAME_ADAPTERS.md).
- Revisar pull requests.

## Cómo reportar bugs

1. Usa la [plantilla de bug](.github/ISSUE_TEMPLATE/bug_report.md).
2. Incluye pasos reproducibles, comportamiento esperado vs. real, versión y entorno.
3. Busca primero si el issue ya existe (usa `is:issue` con palabras clave).
4. Adjunta logs y capturas cuando sea posible, sin exponer secretos ni datos personales ajenos.

## Cómo proponer funcionalidades

1. Usa la [plantilla de feature](.github/ISSUE_TEMPLATE/feature_request.md).
2. Explica el problema real que resuelve, no solo la solución deseada.
3. Si la funcionalidad afecta al MVP, discútela primero en un issue antes de abrir un PR.

## Proceso de pull requests

1. **Discute primero** cuando el cambio sea grande o afecte arquitectura, modelo de datos o API. Consulta [docs/DECISIONS.md](docs/DECISIONS.md).
2. Crea una rama con el prefijo `codex/` o `feat/`, `fix/`, `docs/` según el cambio.
3. Escribe commits con [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):
   - `feat(scope): descripción`
   - `fix(scope): descripción`
   - `docs(scope): descripción`
   - `test(scope): descripción`
   - `refactor(scope): descripción`
   - `chore(scope): descripción`
4. Asegúrate de que pase todo el pipeline: lint, typecheck, tests y build.
5. Agrega o actualiza pruebas junto con el código.
6. Actualiza la documentación afectada (`docs/`, `CHANGELOG.md` cuando aplique).
7. Completa la [plantilla de PR](.github/PULL_REQUEST_TEMPLATE.md).
8. Mantén el PR pequeño y enfocado; un PR, una idea.

## Entorno de desarrollo

El setup local (monorepo, Docker Compose, migraciones y seeds) se documenta en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) y [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md). En resumen:

- Requiere Node.js 22+, pnpm y Docker.
- Instala dependencias con `pnpm install`.
- Levanta los servicios con `docker compose up -d`.
- Ejecuta migraciones y seeds con los scripts definidos en la raíz del monorepo.
- Ejecuta `pnpm test` para unitarias e integración y `pnpm test:e2e` para Playwright.

## Reglas de implementación

- Trabaja por tareas pequeñas y probables de forma independiente.
- Antes de modificar código, explica qué archivos cambiarás (en el issue o PR).
- No agregues dependencias sin justificarlo en el PR.
- No cambies la arquitectura silenciosamente; actualiza las decisiones en `docs/DECISIONS.md`.
- No implementes funciones fuera del alcance del MVP sin abrir antes un issue.
- Usa migraciones para cambios de base de datos y mantén los datos de demostración.
- Evita archivos excesivamente grandes; prefiere módulos con responsabilidades claras.
- Usa TypeScript estricto; valida datos en cliente y servidor.
- Aplica autorización en el backend; nunca confíes solo en la interfaz.
- Mantén secretos fuera del repositorio; usa `.env.example` como referencia.
- Asegúrate de que una instalación nueva pueda iniciarse siguiendo el README.

## Adaptadores de juegos

Para proponer un adaptador oficial nuevo, usa la [plantilla de propuesta de adaptador](.github/ISSUE_TEMPLATE/game_adapter_proposal.md) y lee [docs/GAME_ADAPTERS.md](docs/GAME_ADAPTERS.md). Los adaptadores son configuración tipada; no se aceptan integraciones con APIs externas no autorizadas.

## Revisión de PRs

- Los mantenedores revisan cambios, coherencia con las decisiones registradas y cobertura de pruebas.
- Usa comentarios constructivos; pide aclaraciones antes de marcar *requested changes*.
- Los PRs grandes sin contexto o sin pruebas serán devueltos para ajuste.

## Documentación

Toda la documentación está en español (idioma principal del proyecto). Traducciones al inglés son bienvenidas. Al cambiar comportamiento, actualiza la documentación afectada en el mismo PR.

## Mantenedores y gobernanza

Consulta la sección de gobernanza en [docs/DECISIONS.md](docs/DECISIONS.md) (ADR-038). Las decisiones de arquitectura se toman por consenso de mantenedores y quedan registradas.
