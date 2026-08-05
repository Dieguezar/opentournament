# Política de seguridad

OpenTournament se toma la seguridad en serio. Si encuentras una vulnerabilidad, agradécelo: nos ayudas a proteger a la comunidad.

## Reportar una vulnerabilidad

**No abras un issue público** para vulnerabilidades. En su lugar:

1. Escribe un correo al equipo de seguridad (dirección por definir antes del primer release; mientras tanto, contacta a los mantenedores vía el canal de la organización).
2. Incluye:
   - Descripción del problema y su impacto.
   - Pasos para reproducirlo (sin exponer datos reales de otros usuarios).
   - Versión afectada y entorno (autoalojado, Docker, versión de Node, etc.).
   - Si es posible, una prueba de concepto.
3. Espera confirmación de recepción antes de publicar detalles.

## Proceso de divulgación

1. El equipo de seguridad confirma la recepción en un plazo máximo de 72 horas.
2. Se evalúa el riesgo (severidad, explotabilidad, alcance) y se acuerda un plan.
3. Se desarrolla el parche y una prueba de regresión.
4. El parche se publica en un release de seguridad y el problema se divulga públicamente después, con crédito al reportante si lo desea.

## Versiones soportadas

| Versión | Soportada |
| --- | --- |
| Última versión estable | Sí |
| Versiones anteriores | Solo para vulnerabilidades críticas hasta el siguiente release |
| Ramas de desarrollo | No |

## Prácticas de seguridad del proyecto

- Modelo de amenazas y controles documentados en [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md).
- Autorización siempre en backend; nunca confiar en controles de interfaz.
- Secretos fuera del repositorio; solo se publica `.env.example`.
- Dependencias auditadas en CI y actualizadas con Dependabot.
- Revisión de seguridad en cada PR que toque autenticación, autorización, subida de archivos o pagos.

## Checklist para instancias autoalojadas

- Usar HTTPS con un proxy inverso (Caddy, Traefik o Nginx).
- Cambiar todas las contraseñas y claves de la instalación.
- Restringir el acceso a MinIO y a los puertos internos.
- Mantener la imagen actualizada y aplicar parches de seguridad.
- Configurar respaldos de PostgreSQL y del bucket de objetos.
- Revisar los logs con regularidad.

Detalles en [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md).
