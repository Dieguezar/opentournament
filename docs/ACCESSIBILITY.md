# Accesibilidad

## 1. Objetivo

Cumplir **WCAG 2.1 nivel AA** en todo el frontend (NFR-A11Y-01). La accesibilidad es requisito de aceptación de cada historia de UI.

## 2. Principios

1. Perceptible: contraste AA, textos alternativos, no depender solo del color.
2. Operable: navegación completa por teclado, foco visible, sin atascos.
3. Comprensible: idioma declarado, navegación consistente, errores de formulario claros.
4. Robusto: HTML semántico, roles ARIA solo cuando faltan nativos, validación con tecnologías de asistencia.

## 3. Áreas críticas

### Bracket

- El bracket es el componente más complejo. Debe tener:
  - Alternativa textual accesible (lista ordenada de rondas y partidas) además de la visual.
  - Navegación por teclado entre partidas (flechas + tab).
  - Anuncio de cambios en vivo con `aria-live="polite"` (resultados, avance de ronda).
  - Contraste suficiente en líneas de conexión y estados (ganador/perdedor).

### Formularios

- Labels asociados (`for`/`id`), `aria-describedby` para ayuda y errores.
- Errores inline con `role="alert"` y resumen al inicio del formulario.
- Estados de carga (`aria-busy`) y de éxito anunciados.

### Tiempo real (SSE)

- Las actualizaciones usan regiones live; los usuarios pueden pausar/ocultar la animación.
- Ninguna información crítica depende solo del movimiento (respetar `prefers-reduced-motion`).

### PWA

- Pantalla de instalación accesible; iconos y nombres legibles.
- El modo offline de lectura no degrada la navegación por teclado.

## 4. Herramientas y CI

- `@axe-core/playwright` en páginas clave dentro de los E2E.
- Lighthouse como diagnóstico manual complementario antes del release.
- Revisión manual con lectores de pantalla (NVDA/VoiceOver) antes del release.

## 5. Criterios de aceptación por historia

Toda historia de UI incluye:

- Navegación completa por teclado.
- Contraste AA verificado.
- Textos alternativos presentes.
- Sin bloqueos de foco ni atascos de tabulación.
- Anuncios live para actualizaciones asíncronas.
