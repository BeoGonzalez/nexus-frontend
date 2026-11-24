---
name: Nexus Digital Store
description: Tienda de videojuegos en CLP con vidrio translúcido sobre el color de la portada en foco.
colors:
  porcelana: "#f2f3f5"
  porcelana-elevada: "#fbfbfc"
  tinta: "#0d0f12"
  tinta-2: "#3b414a"
  tinta-3: "#59606a"
  ambar-compra: "#b35200"
  ambar-compra-hover: "#9c4700"
  sobre-ambar: "#ffffff"
  cian-foco: "#0b7285"
  peligro: "#b42318"
  exito: "#1a7a4c"
  aviso: "#8a5a00"
  grafito: "#0e1014"
  grafito-elevado: "#15181d"
  tinta-noche: "#f4f5f7"
  tinta-noche-2: "#bcc1c9"
  tinta-noche-3: "#959ba5"
  ambar-compra-noche: "#ff9900"
  ambar-compra-noche-hover: "#ffad33"
  sobre-ambar-noche: "#1a0e00"
  cian-foco-noche: "#5fd0de"
  peligro-noche: "#ff7a6e"
  exito-noche: "#4cc38a"
  aviso-noche: "#f5b94a"
  vidrio-cromo: "rgb(255 255 255 / 0.72)"
  vidrio-cromo-noche: "rgb(26 29 35 / 0.56)"
  vidrio-elevado: "rgb(250 250 251 / 0.76)"
  vidrio-elevado-noche: "rgb(22 25 31 / 0.82)"
  vidrio-card: "rgb(255 255 255 / 0.52)"
  vidrio-card-noche: "rgb(255 255 255 / 0.055)"
  tinte-claro: "rgb(242 243 245 / 0.74)"
  tinte-noche: "rgb(14 16 20 / 0.58)"
  linea: "rgb(13 15 18 / 0.1)"
  linea-fuerte: "rgb(13 15 18 / 0.18)"
  superficie-hover: "rgb(13 15 18 / 0.05)"
  superficie-presionada: "rgb(13 15 18 / 0.08)"
typography:
  display:
    fontFamily: "Archivo, Geist, ui-sans-serif, sans-serif"
    fontSize: "clamp(2.5rem, 1.35rem + 4.6vw, 5.25rem)"
    fontWeight: 760
    lineHeight: 0.98
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 118"
  headline:
    fontFamily: "Archivo, Geist, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.875rem, 1.35rem + 2.2vw, 3rem)"
    fontWeight: 760
    lineHeight: 1.04
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 118"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  price:
    fontFamily: "Archivo, Geist, ui-sans-serif, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' on"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "'ss01' on, 'cv11' on"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.375
  meta:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  code:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    fontFeature: "'tnum' on"
rounded:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "30px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  contenedor: "72rem"
components:
  button-buy:
    backgroundColor: "{colors.ambar-compra}"
    textColor: "{colors.sobre-ambar}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-buy-hover:
    backgroundColor: "{colors.ambar-compra-hover}"
    textColor: "{colors.sobre-ambar}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-outline-hover:
    backgroundColor: "{colors.superficie-hover}"
  button-add-icon:
    backgroundColor: "{colors.ambar-compra}"
    textColor: "{colors.sobre-ambar}"
    rounded: "{rounded.pill}"
    size: "44px"
  nav-link:
    textColor: "{colors.tinta-2}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  nav-link-active:
    backgroundColor: "{colors.superficie-presionada}"
    textColor: "{colors.tinta}"
  card-game:
    backgroundColor: "{colors.vidrio-card}"
    rounded: "{rounded.lg}"
    padding: "8px"
  input-field:
    backgroundColor: "{colors.porcelana-elevada}"
    textColor: "{colors.tinta}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "48px"
  chip-segmented:
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  chip-segmented-active:
    backgroundColor: "{colors.porcelana-elevada}"
    textColor: "{colors.tinta}"
  step-active:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.porcelana}"
    rounded: "{rounded.pill}"
    size: "24px"
---

# Design System: Nexus Digital Store

## Overview

**Creative North Star: "Vidrio cromático"**

La tienda no tiene color propio: lo toma prestado del juego que se está mirando. La base es neutra y fría (porcelana en claro, grafito profundo en oscuro) y, detrás de todo, la portada en foco se amplía, se desenfoca y se tiñe hasta volverse la luz de la página. Sobre esa luz flota un vidrio con grosor: borde fino, highlight interior arriba y abajo, saturación alta y sombras difusas. El vidrio es el material de lo que flota (navbar, drawer, diálogos, controles flotantes), no una textura aplicada a todo.

La densidad es generosa en la tienda (Persuade y Experience: hero a escala, estantería de plataformas como momento tipográfico) y compacta en la consola de administración (Operate: superficies opacas, vidrio solo en la barra superior y los diálogos). Claro y oscuro son de primera clase; el tema sigue `prefers-color-scheme`, se fija en `<html data-theme>` antes del primer pintado y la elección manual se recuerda en `localStorage` (`nexus-theme`).

El movimiento explica cambios: la portada viaja de la card a la ficha por elemento compartido, el producto vuela al contador del carrito, el contador rebota. Springs cortos, solo `transform` y `opacity`, y con movimiento reducido solo quedan fundidos. Sin neón, sin resplandores, sin estética de terminal, sin marca ni assets de Apple.

**Key Characteristics:**
- Interfaz neutra; el único color de página viene de la portada en foco.
- Tres materiales de vidrio (cromo, elevado, card) más una superficie opaca para operar.
- Ámbar solo para comprar y carrito; cian solo para foco.
- Titulares en Archivo ensanchado (`wdth` 118); interfaz en Geist; códigos en Geist Mono.
- Píldoras para controles; radios grandes en superficies grandes.
- Contraste medido sobre el fondo real renderizado, no sobre un color plano.

## Colors

Neutros fríos sin tinte de marca; dos acentos con trabajos fijos y una paleta de estado ajustada por tema.

### Primary
- **Ámbar de compra** (`ambar-compra` en claro, `ambar-compra-noche` en oscuro): el acento de marca ámbar, oscurecido en claro para dar 5.0:1 con texto blanco y puro en oscuro con texto casi negro (`sobre-ambar-noche`). Botón "Añadir al carrito", botón "+" de las cards, contador del carrito. Hover: `ambar-compra-hover` / `ambar-compra-noche-hover`.

### Secondary
- **Cian de foco** (`cian-foco` / `cian-foco-noche`): el cian de marca, oscurecido en claro. Anillo de foco (2px, offset 2px), caret de los campos, selección de texto al 28%, luz de borde de las escenas 3D.

### Tertiary
- **Estados** (`peligro`, `exito`, `aviso` y sus variantes `-noche`): solo para mensajes de error, confirmación de pago y advertencias de stock. Nunca decorativos.

### Neutral
- **Porcelana fría** (`porcelana`) / **Grafito profundo** (`grafito`): fondo de página y `theme-color` del navegador.
- **Porcelana elevada** (`porcelana-elevada`) / **Grafito elevado** (`grafito-elevado`): superficies opacas (admin, recibo imprimible, campos de formulario) y fallback sólido del vidrio.
- **Tinta / Tinta 2 / Tinta 3** (`tinta`, `tinta-2`, `tinta-3` y `tinta-noche-*`): texto primario, secundario (9.4:1 sobre porcelana) y meta (5.9:1). Tinta también rellena el paso activo del checkout y el check de los filtros.
- **Líneas y superficies de estado** (`linea`, `linea-fuerte`, `superficie-hover`, `superficie-presionada`): tinta a 10/18/5/8% en claro, blanco a 10/18/7/14% en oscuro. Bordes, anillos de botones secundarios, hover y estado activo de la navegación.
- **Tinte** (`tinte-claro` 74%, `tinte-noche` 58%): velo sobre la portada desenfocada que garantiza el contraste del texto.

### Named Rules
**La Regla de la Portada Prestada.** La interfaz no aporta color de fondo. Sin portada en foco, el fondo es un campo neutro de tres degradados radiales pálidos (cian, durazno, lavanda en claro; petróleo, marrón, índigo en oscuro) sobre el fondo base. Ningún gradiente de marca.

**La Regla de un Trabajo por Acento.** Ámbar significa comprar; cian significa foco. Si un elemento no compra ni tiene foco, no lleva ninguno de los dos.

**La Regla del Contraste Medido.** El tinte y la opacidad del vidrio se fijan midiendo el texto sobre el fondo real renderizado con la portada más oscura (Starfield) y la más clara (Gran Turismo 7) del catálogo. Medición actual: claro ≥ 5.09:1, oscuro ≥ 5.25:1 en todas las pantallas. Bajar el tinte o la opacidad del cromo exige volver a medir.

## Typography

**Display Font:** Archivo con eje de ancho (fallback Geist, ui-sans-serif)
**Body Font:** Geist (fallback ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono (fallback ui-monospace)

**Character:** Archivo ensanchado al 118% y en peso 760–780 da titulares anchos y firmes que nombran el juego o la plataforma; Geist, con `ss01` y `cv11`, mantiene la interfaz callada y precisa. Archivo vuelve a ancho normal para los precios.

### Hierarchy
- **Display** (760, `clamp(2.5rem → 5.25rem)`, 0.98, -0.035em, ancho 118): título del juego en el hero. Si el título supera 26 caracteres baja a Headline.
- **Headline** (760, `clamp(1.875rem → 3rem)`, 1.04, -0.03em, ancho 118): títulos de sección ("En el catálogo", "Plataformas", "Recomendados") y de página.
- **Nombre de plataforma** (780, `clamp(2.25rem → 5rem)`, 0.9, -0.035em, ancho 118): momento tipográfico de la estantería; solo ahí.
- **Title** (1.375rem, 1.2, -0.015em): títulos de paneles, drawer y diálogos.
- **Price** (Archivo ancho normal, 700, 1.75rem, 1, cifras tabulares): precio en el hero y la ficha. En las cards: Archivo 600 a 1.0625rem.
- **Body** (400, 1rem–1.0625rem, interlineado relajado, máx. 52ch): descripciones.
- **Label** (500, 0.9375rem): navegación, botones, títulos de card, meta del hero.
- **Meta** (400, 0.875rem, `tinta-2`): plataforma, stock, conteos.
- **Code** (Geist Mono 600, 0.875rem, tabular): claves digitales del recibo, código de verificación.

### Named Rules
**La Regla de lo Ancho Nombra.** El ancho expandido se reserva para nombrar cosas (juego, plataforma, sección, la marca "Nexus"). Párrafos, botones y datos van en Geist a ancho normal.

**La Regla de las Cifras Tabulares.** Todo precio, cantidad, conteo y número de paso usa cifras tabulares.

## Layout

Contenedor central de 72rem (`max-w-6xl`) con márgenes laterales de 20px en móvil y 32px desde 640px. El shell es persistente: navbar en píldora pegada arriba (12px de margen en móvil, 16px en escritorio) y el fondo cromático fijo detrás de todo; ninguno de los dos se anima entre páginas.

El hero usa una grilla de 12 columnas desde 1024px: portada 3:4 en 5 columnas, texto en 7, con altura mínima de la ventana menos el shell. En móvil la portada se centra arriba (`min(68vw, 20rem)`) y el texto va debajo; la acción primaria queda sobre el pliegue. La grilla de cards pasa de 2 columnas en móvil a 4 en escritorio con separación de 12–16px. El catálogo lleva filtros laterales en escritorio y una hoja inferior en móvil. El checkout usa 7 + 5 columnas con el resumen pegajoso a 96px del borde superior. El carrito es hoja inferior en móvil (máx. 88dvh) y panel lateral de 26rem desde 640px.

Ritmo de espaciado en múltiplos de 4px: separaciones internas de 8–16px, relleno de paneles de 20–32px, secciones de 56–80px vertical. Objetivos táctiles de 44px en pantallas táctiles, 40px con puntero fino. Sin scroll horizontal a 375px.

## Elevation & Depth

La profundidad es de materiales, no de sombras grises. Tres capas de vidrio sobre el fondo cromático, cada una con borde fino, highlight interior de 1px arriba (y abajo en cromo y elevado) y una sombra difusa de radio negativo que se pega a la superficie. En oscuro el highlight baja a 10–16% de blanco y las sombras se vuelven más profundas.

- **Cromo**: navbar, barra superior del admin, enlace de salto. Desenfoque 28px (16px bajo 640px), saturación 180% (170% en oscuro).
- **Elevado**: drawer del carrito, menú móvil, diálogos, panel del asistente, resumen del checkout. Desenfoque 36px (22px bajo 640px), saturación 170%.
- **Card**: cards de juego, tiles de plataforma, paneles de formulario. Sin `backdrop-filter`; se lee como vidrio porque el campo detrás ya está desenfocado.
- **Sólida**: superficies opacas para operar (admin, recibo imprimible).

### Shadow Vocabulary
- **Cromo** (`0 1px 2px rgb(16 24 40 / 0.06), 0 14px 32px -18px rgb(16 24 40 / 0.3)`): elementos de navegación flotantes.
- **Elevado** (`0 2px 6px rgb(16 24 40 / 0.06), 0 32px 64px -28px rgb(16 24 40 / 0.38)`): hojas y diálogos.
- **Card** (`0 1px 2px rgb(16 24 40 / 0.05), 0 10px 24px -16px rgb(16 24 40 / 0.28)`): cards en reposo; también la copia que vuela al carrito.
- **Portada protagonista** (`0 2px 6px rgb(0 0 0 / 0.12), 0 40px 80px -36px rgb(0 0 0 / 0.55)`): portada del hero y de la ficha.

### Named Rules
**La Regla de las Tres Capas.** Como máximo tres capas con `backdrop-filter` visibles a la vez. Las cards nunca llevan `backdrop-filter`; el toggle de tema dentro del cromo es un hueco presionado, no otra capa.

**La Regla del Vidrio que no se Anima.** `backdrop-filter` nunca se anima ni transiciona. El fondo cromático se desenfoca con `filter` en una capa estática.

**La Regla del Fallback Opaco.** Sin soporte de `backdrop-filter` o con `prefers-reduced-transparency`, cromo y elevado pasan a su color sólido, las cards a opaco y el tinte cubre por completo la portada. Con `forced-colors`, los tres vidrios pasan a `Canvas` con borde `CanvasText` y sin sombra.

## Shapes

Escala de radios concéntrica: 8px para elementos pequeños (opciones de filtro, ítems de menú), 12px para campos y miniaturas, 16px para la portada dentro de la card, 22px para cards, tiles, paneles y portadas protagonistas, 30px para hojas, diálogos y el panel del asistente. Todo control flotante o accionable (navbar, botones, enlaces de navegación, contador, chips segmentados, indicadores de paso) es píldora. El radio interior es siempre menor que el exterior: card de 22px con 8px de relleno y portada de 16px.

Las portadas se recortan siempre a 3:4. Los bordes son de 1px; los botones secundarios usan un anillo interior de `linea-fuerte` en lugar de borde. Iconos Lucide con trazo 1.75 (2.25 en el "+" de compra).

## Components

### Buttons
Táctiles y contenidos: píldoras de 48px que solo cambian color y escala.
- **Shape:** píldora (`{rounded.pill}`), 48px de alto en acciones principales, 36px en secundarias de card.
- **Primario (comprar):** fondo ámbar, texto `sobre-ambar`, Geist 600 a 0.9375rem, 24px de relleno horizontal.
- **Hover / Active / Focus:** hover a `ambar-compra-hover` en 150ms; presionado escala 0.98 (0.94 en el botón icono); foco con anillo cian de 2px a 2px de distancia.
- **Secundario:** transparente con anillo interior `linea-fuerte`, texto tinta; hover con `superficie-hover`.
- **Icono de compra:** círculo ámbar de 44px (40px con puntero fino) con "+".
- **Deshabilitado / sin stock:** `superficie-presionada` con texto `tinta-2`, o píldora de anillo con "Sin stock".

### Chips
- **Segmentado** (Recomendados: "En tendencia" / "Para ti"): pozo en píldora con la opción activa en superficie clara.
- **Filtros:** filas de 44px (36px con puntero fino) con checkbox propio de 18px y radio 6px; marcado se rellena de tinta y el check entra con el spring con rebote. El conteo va en `tinta-3` tabular.

### Cards / Containers
- **Corner Style:** 22px (`{rounded.lg}`).
- **Background:** vidrio card; hover sube a `vidrio-card` al 70% (9% en oscuro).
- **Shadow Strategy:** sombra Card (ver Elevation & Depth).
- **Border:** 1px blanco translúcido con highlight interior superior.
- **Internal Padding:** 8px alrededor de la portada; cuerpo de 12px arriba y 6px a los lados. Paneles de formulario 20–28px.

### Inputs / Fields
- **Style:** 48px de alto, radio 12px, fondo `porcelana-elevada`, anillo interior `linea-fuerte`, texto 1rem, placeholder en `tinta-2`, caret cian.
- **Focus:** el anillo pasa a 2px cian. La búsqueda del catálogo pinta el contorno de foco en el contenedor completo.
- **Error / Disabled:** error en `peligro` anunciado con `role="alert"`; deshabilitado al 60% de opacidad.

### Navigation
- **Style:** píldora de vidrio cromo de 56px de alto, centrada en el contenedor. Marca "Nexus" en Archivo ensanchado 780 a 1.0625rem a la izquierda; Catálogo y Pedidos; a la derecha toggle de tema (desde 768px), Ingresar o menú de usuario, carrito.
- **Estados:** enlaces en `tinta-2`; hover a tinta; activo (`aria-current="page"`) con fondo `superficie-presionada` y texto tinta.
- **Móvil:** botón de menú de 44px que abre una hoja de vidrio elevado arriba, con enlaces de 48px y el toggle de tema al pie.
- **Admin:** barra cromo de borde a borde (sin píldora) sobre fondo opaco; navegación lateral como hoja elevada en móvil.

### Fondo cromático
La firma del sistema. Tres capas fijas detrás del contenido: campo neutro de degradados, portada en foco ampliada un 12% por lado y desenfocada (72px, 48px bajo 640px; saturación 1.5; opacidad 0.85 en claro, 0.7 en oscuro) y el tinte. Al cambiar de portada, la nueva aparece y la anterior se funde en 900ms; nunca hay más de dos capas de portada.

### Movimiento
- **Duraciones:** 150ms (hover, cierres), 240ms (menús, fundidos), 360ms (hojas, pasos, entradas), 900ms solo para la entrada del hero y el fundido del fondo.
- **Curvas:** spring amortiguado (≈1% de rebote) para entradas y desplazamientos; spring con rebote (≈8%) solo para confirmaciones (contador del carrito, check del recibo, checkbox); salida suave para fundidos; entrada suave para cierres.
- **Coreografía:** una entrada orquestada por página (hero: portada, meta, título, descripción y compra escalonados 140–380ms); cards con escalonado de 30ms, tope en la octava; card→ficha por elemento compartido; vuelo al carrito animado solo con `transform` y `opacity`; hover de card sube 2px, la portada escala 1.025 y un reflejo sigue al puntero, sin inclinación.
- **Movimiento reducido:** todo se reduce a fundidos lineales; las transiciones de vista no desplazan.

## Do's and Don'ts

### Do:
- **Do** tomar el color de la página de la portada en foco y dejar la interfaz en neutros fríos.
- **Do** reservar el ámbar para comprar y carrito, y el cian para el foco.
- **Do** usar vidrio cromo para navegación flotante, elevado para hojas y diálogos, card para cards, y superficie sólida para pantallas de operación.
- **Do** volver a medir el contraste sobre el fondo real (portada más oscura y más clara) cada vez que cambie el tinte o la opacidad de un vidrio; mínimo actual 5.09:1 en claro y 5.25:1 en oscuro.
- **Do** animar solo `transform` y `opacity`, con duraciones de 150–400ms en la interfaz y 900ms solo para la entrada del hero.
- **Do** dar a cada material su fallback opaco (`prefers-reduced-transparency`, sin `backdrop-filter`, `forced-colors`).
- **Do** usar cifras tabulares en precios, cantidades y conteos, y precios en CLP.
- **Do** mantener los objetivos táctiles en 44px y el foco visible en ambos temas.

### Don't:
- **Don't** apilar más de tres capas con `backdrop-filter` visibles ni ponérselo a las cards.
- **Don't** animar o transicionar `backdrop-filter`.
- **Don't** usar neón, resplandores (*glow*), sombras de color ni estética de terminal.
- **Don't** usar Inter, SF Pro ni ningún nombre, logo o asset de Apple.
- **Don't** poner gradientes de marca ni color de marca como fondo de página.
- **Don't** usar ámbar o cian como decoración, ni los colores de estado fuera de mensajes de estado.
- **Don't** usar el ancho expandido de Archivo en párrafos, botones o datos.
- **Don't** poner etiquetas en mayúsculas con tracking (eyebrows) sobre los titulares; el contexto va en una línea de meta en Geist ("Para PS5. Acción y Aventura.").
