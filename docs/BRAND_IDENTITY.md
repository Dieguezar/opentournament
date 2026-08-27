# OpenTournament — identidad visual v1

Este documento fija la fuente de verdad para la marca y para la biblioteca de Figma. Los colores y patrones de interfaz parten del producto existente; el símbolo parte de la dirección visual aprobada.

## Idea de marca

OpenTournament combina dos formas:

- una **O circular**, que representa apertura, comunidad y un sistema sin principio ni fin;
- un **bracket vertical de dos participantes**, que representa la competencia y también funciona como una T.

La marca debe sentirse técnica, abierta y competitiva, sin adoptar la estética agresiva habitual de esports.

## Construcción oficial del símbolo

La geometría se construye con formas booleanas, nunca a ojo ni a partir de una imagen rasterizada.

### Retícula

- Altura maestra: `1000 u`.
- O: `1000 × 1000 u`.
- Bracket: `800 × 1000 u` (80% del ancho de la O).
- Separación entre O y bracket: `240 u`.
- Caja total del símbolo: `2040 × 1000 u`.

### O circular

- Círculo exterior: diámetro `1000 u`.
- Círculo interior: diámetro `680 u`, centrado.
- Grosor resultante del anillo: `160 u`.
- La forma final es una resta booleana: exterior menos interior.

### Bracket vertical de dos entradas

Usar una unión booleana de cinco rectángulos, todos con el mismo color y sin remates especiales:

| Parte | X | Y | Ancho | Alto |
| --- | ---: | ---: | ---: | ---: |
| Entrada izquierda | 0 | 0 | 160 | 580 |
| Entrada derecha | 640 | 0 | 160 | 580 |
| Brazo izquierdo | 0 | 420 | 480 | 160 |
| Brazo derecho | 320 | 420 | 480 | 160 |
| Salida central | 320 | 420 | 160 | 580 |

La caja visible del bracket mide exactamente `800 × 1000 u`: conserva la altura de la O y usa un ancho óptico equivalente al 80%. Las tres extensiones visibles —las dos entradas superiores y la salida inferior— miden exactamente `420 u`; los rectángulos verticales se solapan `160 u` con el travesaño para formar una sola pieza.

### Espacio de seguridad y tamaños

- Espacio libre mínimo: `160 u` alrededor del símbolo, equivalente al grosor de la O.
- Símbolo con palabra: no usar por debajo de `120 px` de ancho.
- Símbolo solo: mínimo recomendado `32 px` de alto.
- Favicon cuadrado: centrar el símbolo completo dentro de un área segura del 75%; si pierde legibilidad a 16 px, usar únicamente la O.

## Color

### Marca

| Uso | Tema oscuro | Tema claro |
| --- | --- | --- |
| O / marca principal | `#4C7DFF` | `#255EDB` |
| Bracket | `#FFFFFF` | `#111827` |
| Fondo recomendado | `#111318` | `#F7F8FA` |

Versiones permitidas: color, blanco total y negro/ink total. No usar degradados, contornos adicionales, sombras ni colores distintos en la punta del bracket.

### Tokens semánticos existentes

| Token | Oscuro | Claro |
| --- | --- | --- |
| canvas | `#111318` | `#F7F8FA` |
| surface | `#171A21` | `#FFFFFF` |
| surface-raised | `#1D212A` | `#F1F3F6` |
| border | `#2B303B` | `#D9DEE7` |
| text | `#F4F6F8` | `#111827` |
| text-muted | `#A8B0BF` | `#5B6472` |
| primary | `#4C7DFF` | `#255EDB` |
| primary-strong | `#3E6EE9` | `#1E4FBD` |
| primary-soft | `rgba(76,125,255,.14)` | `rgba(37,94,219,.10)` |
| on-primary | `#FFFFFF` | `#FFFFFF` |
| success | `#2BB673` | `#15803D` |
| warning | `#D8A13A` | `#B45309` |
| danger | `#E05D62` | `#C7353D` |
| control-background | `#0F1116` | `#FFFFFF` |
| canvas-subtle | `#14171D` | `#EEF1F5` |

## Tipografía e iconografía

- Interfaz, marca verbal y datos: **Inter**.
- Usar Regular, Semi Bold y Bold para construir jerarquía sin mezclar familias.
- Pesos principales: Regular, Medium, SemiBold y Bold.
- Iconos: **Phosphor Icons**, con el mismo peso visual del texto adyacente.

Escala inicial de estilos: Display 48/52, H1 40/44, H2 32/38, H3 24/30, Body Large 18/28, Body 16/24, Body Small 14/20, Label 14/20, Label Small 12/16 y Code 14/20.

## Forma y espaciado

- Escala de espacio: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- Radios: `0, 3, 4, 5, 6, full`.
- Trazo normal: `1 px`.
- Foco visible: `2 px` en color primary, con `3 px` de separación cuando el control lo permita.
- Controles: alturas base `32, 40, 44, 48 px`.

Los radios contenidos son intencionales: OpenTournament debe verse preciso y operativo, no blando ni excesivamente redondeado.

## Componentes v1 de Figma

La biblioteca inicial cubre las piezas que ya aparecen en el producto:

1. Button: Primary, Secondary y Danger; tamaños Small y Medium; Default, Hover, Focus y Disabled.
2. Field: Input, Select y Textarea; Default, Focus, Error y Disabled.
3. Badge: Neutral, Primary, Success, Warning y Danger.
4. Card/Panel: Base, Raised y Feature.
5. Header/Nav: Guest y Authenticated.
6. Match Card: Scheduled, Live y Final.

Cada familia tendrá ejemplos claros y oscuros, bindings a variables, propiedades editables y documentación de uso.

## Estructura del archivo de Figma

Orden acordado: `Cover`, `Getting Started`, `Foundations`, `---`, una página por familia de componentes, `---`, `Utilities`.

El plan Starter de Figma disponible admite una sola modalidad por colección. Por eso la v1 conserva Light y Dark como namespaces semánticos separados (`light/...` y `dark/...`) y los componentes se publican por tema. Si el archivo pasa a un plan con múltiples modos, esos namespaces se migran a modos reales sin cambiar los valores ni la API de código.

## Fuente de verdad

- Colores, tipografía y comportamiento de componentes: `apps/web/app/showcase.css`, `apps/web/app/workspace-pages.module.css` y los componentes React actuales.
- Geometría de marca: este documento y la versión vectorial de Figma.
- Ante cualquier conflicto futuro, el código gana para tokens de producto y el archivo maestro de marca gana para el símbolo.
