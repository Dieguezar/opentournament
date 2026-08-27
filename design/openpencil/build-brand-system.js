await Promise.all([
  figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
]);

const C = {
  canvasDark: '#111318',
  canvasSubtleDark: '#14171D',
  surfaceDark: '#171A21',
  surfaceRaisedDark: '#1D212A',
  borderDark: '#2B303B',
  textDark: '#F4F6F8',
  mutedDark: '#A8B0BF',
  blueDark: '#4C7DFF',
  blueStrongDark: '#3E6EE9',
  successDark: '#2BB673',
  warningDark: '#D8A13A',
  dangerDark: '#E05D62',
  canvasLight: '#F7F8FA',
  canvasSubtleLight: '#EEF1F5',
  surfaceLight: '#FFFFFF',
  surfaceRaisedLight: '#F1F3F6',
  borderLight: '#D9DEE7',
  textLight: '#111827',
  mutedLight: '#5B6472',
  blueLight: '#255EDB',
  blueStrongLight: '#1E4FBD',
  successLight: '#15803D',
  warningLight: '#B45309',
  dangerLight: '#C7353D',
};

const LOGO = {
  markSize: 1000,
  stroke: 160,
  gap: 240,
  bracketWidth: 800,
  totalWidth: 2040,
  bracketOffset: 1240,
  bracketPieces: [
    [0, 0, 160, 580, 'Input / Left'],
    [640, 0, 160, 580, 'Input / Right'],
    [0, 420, 480, 160, 'Arm / Left'],
    [320, 420, 480, 160, 'Arm / Right'],
    [320, 420, 160, 580, 'Output / Center'],
  ],
};

function rgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

function solid(hex, opacity = 1) {
  return { type: 'SOLID', color: rgb(hex), opacity };
}

function fill(node, hex, opacity = 1) {
  node.fills = [solid(hex, opacity)];
}

function stroke(node, hex, weight = 1, opacity = 1) {
  node.strokes = [solid(hex, opacity)];
  node.strokeWeight = weight;
  node.strokeAlign = 'INSIDE';
}

function place(node, x, y, w, h) {
  node.x = x;
  node.y = y;
  node.resize(w, h);
  return node;
}

function addFrame(parent, name, x, y, w, h, background, radius = 0) {
  const node = figma.createFrame();
  node.name = name;
  parent.appendChild(node);
  place(node, x, y, w, h);
  node.clipsContent = false;
  node.cornerRadius = radius;
  fill(node, background);
  return node;
}

function addRect(parent, name, x, y, w, h, color, radius = 0, opacity = 1) {
  const node = figma.createRectangle();
  node.name = name;
  parent.appendChild(node);
  place(node, x, y, w, h);
  node.cornerRadius = radius;
  fill(node, color, opacity);
  return node;
}

function addLine(parent, name, x, y, w, color, weight = 1, opacity = 1) {
  const node = figma.createLine();
  node.name = name;
  parent.appendChild(node);
  node.x = x;
  node.y = y;
  node.resize(w, 0);
  node.strokes = [solid(color, opacity)];
  node.strokeWeight = weight;
  return node;
}

function addText(parent, name, value, x, y, size, color, options = {}) {
  const node = figma.createText();
  node.name = name;
  parent.appendChild(node);
  node.fontName = {
    family: 'Inter',
    style: options.style || 'Regular',
  };
  node.characters = value;
  node.fontSize = size;
  node.fills = [solid(color)];
  node.x = x;
  node.y = y;
  node.textAutoResize = options.width ? 'HEIGHT' : 'WIDTH_AND_HEIGHT';
  // OpenPencil 0.14 can report an out-of-memory error when an auto line height
  // is serialized as NaN. Keep every text metric finite in the generated file.
  const resolvedLineHeight = options.lineHeight ?? Math.round(size * 1.3);
  node.lineHeight = resolvedLineHeight;
  if (options.letterSpacing !== undefined) {
    node.letterSpacing = options.letterSpacing;
  }
  if (options.align) node.textAlignHorizontal = options.align;
  if (options.opacity !== undefined) node.opacity = options.opacity;
  const widthFactor = options.mono ? 0.62 : 0.58;
  const sourceLines = value.split('\n');
  const naturalWidths = sourceLines.map((line) => Math.max(size, line.length * size * widthFactor));
  const textWidth = options.width ?? Math.ceil(Math.max(...naturalWidths));
  const visualRows = options.width
    ? sourceLines.reduce((rows, lineWidth) => rows + Math.max(1, Math.ceil(lineWidth.length * size * widthFactor / options.width)), 0)
    : sourceLines.length;
  node.resize(textWidth, Math.max(resolvedLineHeight * visualRows, 1));
  // Keep the measured bounds but avoid a desktop reflow loop when reopening
  // generated .fig files in OpenPencil 0.14.
  node.textAutoResize = 'NONE';
  return node;
}

function label(parent, value, x, y, color, width) {
  return addText(parent, `Label / ${value}`, value.toUpperCase(), x, y, 12, color, {
    style: 'Semi Bold',
    letterSpacing: 1.2,
    width,
  });
}

function titleBlock(parent, eyebrow, title, subtitle, dark = false) {
  const text = dark ? C.textDark : C.textLight;
  const muted = dark ? C.mutedDark : C.mutedLight;
  const blue = dark ? C.blueDark : C.blueLight;
  label(parent, eyebrow, 96, 88, blue, 560);
  addText(parent, `Title / ${title}`, title, 96, 120, 48, text, {
    style: 'Bold',
    lineHeight: 54,
    width: 1100,
  });
  addText(parent, 'Subtitle', subtitle, 96, 188, 18, muted, {
    lineHeight: 28,
    width: 920,
  });
}

function createPage(name, height, background = C.canvasLight) {
  const page = figma.createPage();
  page.name = name;
  const board = addFrame(page, `${name} / Artboard`, 0, 0, 1440, height, background);
  board.clipsContent = true;
  return { page, board };
}

function createLogoComponent(parent, name, x, y, scale, oColor, bracketColor) {
  const component = figma.createComponent();
  component.name = name;
  parent.appendChild(component);
  place(component, x, y, LOGO.totalWidth * scale, LOGO.markSize * scale);
  component.clipsContent = false;
  component.fills = [];

  const outer = figma.createEllipse();
  component.appendChild(outer);
  place(outer, 0, 0, LOGO.markSize * scale, LOGO.markSize * scale);
  fill(outer, oColor);
  const inner = figma.createEllipse();
  component.appendChild(inner);
  place(inner, LOGO.stroke * scale, LOGO.stroke * scale, (LOGO.markSize - LOGO.stroke * 2) * scale, (LOGO.markSize - LOGO.stroke * 2) * scale);
  fill(inner, '#000000');
  const ring = figma.subtract([outer, inner], component);
  ring.name = 'O / Boolean ring / 1000×1000u';
  fill(ring, oColor);

  const offset = LOGO.bracketOffset * scale;
  const pieces = LOGO.bracketPieces.map(([px, py, pw, ph, part]) => {
    const node = figma.createRectangle();
    node.name = part;
    component.appendChild(node);
    place(node, offset + px * scale, py * scale, pw * scale, ph * scale);
    fill(node, bracketColor);
    return node;
  });
  const bracket = figma.union(pieces, component);
  bracket.name = 'Bracket / Boolean union / 800×1000u';
  fill(bracket, bracketColor);
  return component;
}

function createLogoArtwork(parent, name, x, y, scale, oColor, bracketColor) {
  const artwork = figma.createFrame();
  artwork.name = name;
  parent.appendChild(artwork);
  place(artwork, x, y, LOGO.totalWidth * scale, LOGO.markSize * scale);
  artwork.clipsContent = false;
  artwork.fills = [];

  const outer = figma.createEllipse();
  outer.name = 'O / Outer';
  artwork.appendChild(outer);
  place(outer, 0, 0, LOGO.markSize * scale, LOGO.markSize * scale);
  fill(outer, oColor);
  const inner = figma.createEllipse();
  inner.name = 'O / Counter';
  artwork.appendChild(inner);
  place(inner, LOGO.stroke * scale, LOGO.stroke * scale, (LOGO.markSize - LOGO.stroke * 2) * scale, (LOGO.markSize - LOGO.stroke * 2) * scale);
  fill(inner, '#000000');
  const ring = figma.subtract([outer, inner], artwork);
  ring.name = 'O / Boolean ring';
  fill(ring, oColor);

  const offset = LOGO.bracketOffset * scale;
  const pieces = LOGO.bracketPieces.map(([px, py, pw, ph, part]) => {
    const node = figma.createRectangle();
    node.name = part;
    artwork.appendChild(node);
    place(node, offset + px * scale, py * scale, pw * scale, ph * scale);
    fill(node, bracketColor);
    return node;
  });
  const bracket = figma.union(pieces, artwork);
  bracket.name = 'Bracket / Boolean union';
  fill(bracket, bracketColor);
  return artwork;
}

function addLogoUsage(parent, component, x, y, w, h) {
  const instance = component.createInstance();
  instance.name = `${component.name} / Instance`;
  parent.appendChild(instance);
  place(instance, x, y, w, h);
  return instance;
}

function tokenSwatch(parent, x, y, name, hex, darkText = false) {
  const swatch = addFrame(parent, `Token / ${name}`, x, y, 184, 122, hex, 6);
  stroke(swatch, darkText ? '#000000' : '#FFFFFF', 1, 0.12);
  const caption = addFrame(swatch, 'Accessible token caption', 0, 64, 184, 58, C.canvasDark, 0);
  addText(caption, 'Token name', name, 14, 8, 12, C.textDark, {
    style: 'Semi Bold',
  });
  addText(caption, 'Token value', hex, 14, 30, 12, C.textDark, {
    mono: true,
  });
  return swatch;
}

function addBadge(parent, name, textValue, x, y, background, foreground, border) {
  const width = Math.max(72, textValue.length * 8 + 24);
  const badge = addFrame(parent, name, x, y, width, 28, background, 4);
  if (border) stroke(badge, border, 1);
  addText(badge, 'Label', textValue, 12, 6, 12, foreground, { style: 'Semi Bold' });
  return badge;
}

function addButton(parent, name, textValue, x, y, kind, state, theme = 'dark', size = 'medium') {
  const dark = theme === 'dark';
  const h = size === 'small' ? 32 : 40;
  const px = size === 'small' ? 14 : 18;
  const textSize = size === 'small' ? 13 : 14;
  const width = Math.max(size === 'small' ? 92 : 112, textValue.length * 8 + px * 2);
  let bg;
  let fg;
  let border;
  if (kind === 'primary') {
    bg = state === 'hover' ? C.blueStrongLight : C.blueLight;
    fg = '#FFFFFF';
  } else if (kind === 'danger') {
    bg = state === 'hover' ? '#A92B33' : C.dangerLight;
    fg = '#FFFFFF';
  } else {
    bg = dark ? C.surfaceRaisedDark : C.surfaceLight;
    fg = dark ? C.textDark : C.textLight;
    border = dark ? C.borderDark : C.borderLight;
  }
  const button = figma.createComponent();
  button.name = name;
  parent.appendChild(button);
  place(button, x, y, width, h);
  button.cornerRadius = 5;
  fill(button, bg);
  if (border) stroke(button, border, 1);
  if (state === 'disabled') button.opacity = 0.38;
  if (state === 'focus') {
    stroke(button, dark ? C.blueDark : C.blueLight, 2);
    button.effects = [{
      type: 'DROP_SHADOW',
      color: { ...rgb(dark ? C.blueDark : C.blueLight), a: 0.3 },
      offset: { x: 0, y: 0 },
      radius: 5,
      spread: 2,
      visible: true,
      blendMode: 'NORMAL',
    }];
  }
  const t = addText(button, 'Label', textValue, 0, 0, textSize, fg, { style: 'Semi Bold' });
  const estimatedTextWidth = textValue.length * textSize * 0.52;
  t.x = Math.round((width - estimatedTextWidth) / 2);
  t.y = Math.round((h - textSize * 1.3) / 2);
  return button;
}

function addField(parent, name, labelValue, placeholder, x, y, w, state, theme = 'light', multiline = false) {
  const dark = theme === 'dark';
  const fg = dark ? C.textDark : C.textLight;
  const muted = dark ? C.mutedDark : C.mutedLight;
  const base = dark ? '#0F1116' : C.surfaceLight;
  const border = state === 'error'
    ? (dark ? C.dangerDark : C.dangerLight)
    : state === 'focus'
      ? (dark ? C.blueDark : C.blueLight)
      : (dark ? C.borderDark : C.borderLight);
  const component = figma.createComponent();
  component.name = name;
  parent.appendChild(component);
  place(component, x, y, w, multiline ? 132 : 88);
  component.fills = [];
  addText(component, 'Label', labelValue, 0, 0, 13, fg, { style: 'Semi Bold' });
  const control = addFrame(component, 'Control', 0, 28, w, multiline ? 88 : 44, base, 5);
  stroke(control, border, state === 'focus' ? 2 : 1);
  addText(control, 'Value', placeholder, 14, multiline ? 13 : 12, 14, muted, {
    width: w - 28,
    lineHeight: 20,
  });
  if (state === 'disabled') component.opacity = 0.42;
  if (state === 'error') addText(component, 'Error message', 'Revisá este campo.', 0, multiline ? 120 : 78, 12, border);
  return component;
}

function addPanel(parent, name, x, y, w, h, theme = 'light', raised = false) {
  const dark = theme === 'dark';
  const panel = figma.createComponent();
  panel.name = name;
  parent.appendChild(panel);
  place(panel, x, y, w, h);
  panel.cornerRadius = 6;
  fill(panel, dark ? (raised ? C.surfaceRaisedDark : C.surfaceDark) : (raised ? C.surfaceLight : C.canvasSubtleLight));
  stroke(panel, dark ? C.borderDark : C.borderLight, 1);
  if (raised) {
    panel.effects = [{
      type: 'DROP_SHADOW',
      color: { ...rgb('#0F1116'), a: dark ? 0.38 : 0.12 },
      offset: { x: 0, y: 8 },
      radius: 24,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL',
    }];
  }
  return panel;
}

function sectionCard(parent, name, x, y, w, h, dark = false) {
  const card = addFrame(parent, name, x, y, w, h, dark ? C.surfaceDark : C.surfaceLight, 8);
  stroke(card, dark ? C.borderDark : C.borderLight, 1);
  return card;
}

// Reset the file so rerunning this script stays deterministic.
const initialPage = figma.root.children[0];
for (const page of [...figma.root.children]) {
  if (page !== initialPage) page.remove();
}
figma.currentPage = initialPage;
for (const child of [...initialPage.children]) child.remove();
initialPage.name = '00 Cover';
const coverBoard = addFrame(initialPage, '00 Cover / Artboard', 0, 0, 1440, 900, C.canvasDark);
coverBoard.clipsContent = true;

const foundations = createPage('01 Foundations', 2150, C.canvasLight);
const logoPage = createPage('02 Logo', 2250, C.canvasLight);
const buttonsPage = createPage('03 Buttons', 1600, C.canvasLight);
const fieldsPage = createPage('04 Fields & Badges', 1750, C.canvasLight);
const cardsPage = createPage('05 Cards', 1500, C.canvasLight);
const navigationPage = createPage('06 Navigation', 1420, C.canvasLight);
const matchesPage = createPage('07 Match Cards', 1700, C.canvasLight);

// Official vector masters.
figma.currentPage = logoPage.page;
const logoDark = createLogoComponent(logoPage.board, 'Logo/Symbol/Dark', 96, 340, 0.25, C.blueDark, '#FFFFFF');
const logoLight = createLogoComponent(logoPage.board, 'Logo/Symbol/Light', 760, 340, 0.25, C.blueLight, C.textLight);
const logoMono = createLogoComponent(logoPage.board, 'Logo/Symbol/MonoWhite', 96, 1210, 0.18, C.textDark, C.textDark);

// Cover.
figma.currentPage = initialPage;
addRect(coverBoard, 'Ambient / Brand soft', 1010, -80, 520, 520, C.blueDark, 260, 0.08);
addRect(coverBoard, 'Ambient / Brand soft 2', -220, 620, 460, 460, C.blueDark, 230, 0.05);
label(coverBoard, 'Open source identity system · v1.0', 96, 82, C.blueDark, 520);
createLogoArtwork(coverBoard, 'Logo artwork / Cover', 475.2, 168, 0.24, C.blueDark, C.textDark);
addText(coverBoard, 'Wordmark', 'OpenTournament', 96, 484, 76, C.textDark, {
  style: 'Bold',
  letterSpacing: -2.4,
  width: 1248,
  align: 'CENTER',
});
addText(coverBoard, 'Tagline', 'Infraestructura abierta para competir mejor.', 96, 584, 22, C.mutedDark, {
  lineHeight: 32,
  width: 1248,
  align: 'CENTER',
});
addLine(coverBoard, 'Divider', 96, 712, 1248, C.borderDark, 1);
addText(coverBoard, 'Footer / Geometry', 'O + bracket vertical de 2 entradas · ancho óptico 80%', 96, 752, 13, C.mutedDark, {
  mono: true,
});
addText(coverBoard, 'Footer / Values', 'OPEN · PRECISE · COMPETITIVE', 990, 752, 12, C.blueDark, {
  style: 'Semi Bold',
  letterSpacing: 1.4,
  width: 354,
  align: 'RIGHT',
});

// Foundations.
figma.currentPage = foundations.page;
titleBlock(foundations.board, 'Foundations', 'Una identidad operativa, no decorativa.', 'La marca y la interfaz comparten una misma lógica: claridad, precisión y competencia sin agresividad visual.');
const brandCard = sectionCard(foundations.board, 'Brand colors', 96, 292, 1248, 340, false);
addText(brandCard, 'Section title', 'Color de marca', 28, 24, 26, C.textLight, { style: 'Bold' });
addText(brandCard, 'Section note', 'El azul identifica la apertura. Ink y blanco mantienen la geometría del bracket neutral.', 28, 66, 14, C.mutedLight, { width: 820, lineHeight: 22 });
tokenSwatch(brandCard, 28, 128, 'brand/dark', C.blueDark);
tokenSwatch(brandCard, 228, 128, 'brand/light', C.blueLight);
tokenSwatch(brandCard, 428, 128, 'ink', C.textLight);
tokenSwatch(brandCard, 628, 128, 'canvas/dark', C.canvasDark);
tokenSwatch(brandCard, 828, 128, 'canvas/light', C.canvasLight, true);
tokenSwatch(brandCard, 1028, 128, 'white', '#FFFFFF', true);

const darkTokens = sectionCard(foundations.board, 'Dark tokens', 96, 672, 604, 468, true);
addText(darkTokens, 'Title', 'Tema oscuro', 28, 24, 24, C.textDark, { style: 'Bold' });
const darkSwatches = [
  ['canvas', C.canvasDark], ['surface', C.surfaceDark], ['raised', C.surfaceRaisedDark],
  ['border', C.borderDark], ['text', C.textDark], ['muted', C.mutedDark],
  ['success', C.successDark], ['warning', C.warningDark], ['danger', C.dangerDark],
];
darkSwatches.forEach(([name, color], index) => {
  const col = index % 3;
  const row = Math.floor(index / 3);
  tokenSwatch(darkTokens, 28 + col * 184, 82 + row * 124, `dark/${name}`, color, ['text'].includes(name));
});
const lightTokens = sectionCard(foundations.board, 'Light tokens', 740, 672, 604, 468, false);
addText(lightTokens, 'Title', 'Tema claro', 28, 24, 24, C.textLight, { style: 'Bold' });
const lightSwatches = [
  ['canvas', C.canvasLight], ['surface', C.surfaceLight], ['raised', C.surfaceRaisedLight],
  ['border', C.borderLight], ['text', C.textLight], ['muted', C.mutedLight],
  ['success', C.successLight], ['warning', C.warningLight], ['danger', C.dangerLight],
];
lightSwatches.forEach(([name, color], index) => {
  const col = index % 3;
  const row = Math.floor(index / 3);
  tokenSwatch(lightTokens, 28 + col * 184, 82 + row * 124, `light/${name}`, color, ['canvas', 'surface', 'raised', 'border'].includes(name));
});

const typeCard = sectionCard(foundations.board, 'Typography', 96, 1180, 780, 770, false);
addText(typeCard, 'Title', 'Tipografía', 28, 24, 26, C.textLight, { style: 'Bold' });
addText(typeCard, 'Note', 'Inter para marca, interfaz y datos. Una sola familia abierta mantiene el sistema estable y consistente.', 28, 66, 14, C.mutedLight, { width: 680, lineHeight: 22 });
const typeRows = [
  ['Display', '48 / 52', 48, 52, 'Competir es colaborar.'],
  ['H1', '40 / 44', 40, 44, 'Torneos abiertos.'],
  ['H2', '32 / 38', 32, 38, 'Bracket principal'],
  ['H3', '24 / 30', 24, 30, 'Próximos partidos'],
  ['Body', '16 / 24', 16, 24, 'Organizá competencias con reglas claras.'],
  ['Label', '14 / 20', 14, 20, 'ESTADO DEL PARTIDO'],
  ['Code', '14 / 20', 14, 20, 'match_id: ot_2048'],
];
let typeY = 118;
for (const [styleName, metrics, size, lineHeight, sample] of typeRows) {
  addText(typeCard, `${styleName} / Name`, styleName, 28, typeY + 4, 12, C.mutedLight, { style: 'Semi Bold', width: 76 });
  addText(typeCard, `${styleName} / Metrics`, metrics, 106, typeY + 4, 11, C.mutedLight, { mono: true, width: 66 });
  addText(typeCard, `${styleName} / Sample`, sample, 190, typeY, size, C.textLight, { style: styleName === 'Body' || styleName === 'Code' ? 'Regular' : 'Semi Bold', mono: styleName === 'Code', lineHeight, width: 540 });
  typeY += Math.max(lineHeight + 34, 74);
}

const spacingCard = sectionCard(foundations.board, 'Spacing and radius', 916, 1180, 428, 770, false);
addText(spacingCard, 'Title', 'Espacio y forma', 28, 24, 26, C.textLight, { style: 'Bold' });
addText(spacingCard, 'Note', 'Escalas chicas y precisas. El producto no debe sentirse blando.', 28, 66, 14, C.mutedLight, { width: 350, lineHeight: 22 });
label(spacingCard, 'Spacing', 28, 126, C.blueLight, 180);
const spaces = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
spaces.forEach((space, index) => {
  const yy = 162 + index * 38;
  addText(spacingCard, `Space ${space}`, String(space), 28, yy, 11, C.mutedLight, { mono: true, width: 32 });
  addRect(spacingCard, `spacing/${space}`, 78, yy + 2, space * 3, 12, C.blueLight, 2);
});
label(spacingCard, 'Radius', 240, 126, C.blueLight, 150);
[0, 3, 4, 5, 6, 999].forEach((radius, index) => {
  const yy = 162 + index * 72;
  addRect(spacingCard, `radius/${radius}`, 240, yy, 72, 44, C.surfaceRaisedLight, radius === 999 ? 22 : radius);
  stroke(spacingCard.children[spacingCard.children.length - 1], C.borderLight, 1);
  addText(spacingCard, `Radius label ${radius}`, radius === 999 ? 'full' : String(radius), 326, yy + 14, 11, C.mutedLight, { mono: true });
});
addText(foundations.board, 'Footer', 'OpenTournament Design System · Foundations v1.0', 96, 2058, 12, C.mutedLight, { mono: true });

// Logo page documentation.
figma.currentPage = logoPage.page;
titleBlock(logoPage.board, 'Logo system', 'La O abre. El bracket organiza.', 'El bracket conserva la altura de la O y ocupa el 80% de su ancho. El equilibrio está fijado por la retícula.');
const darkLogoBg = addFrame(logoPage.board, 'Dark logo stage', 72, 292, 632, 430, C.canvasDark, 8);
const lightLogoBg = addFrame(logoPage.board, 'Light logo stage', 736, 292, 632, 430, C.surfaceLight, 8);
stroke(lightLogoBg, C.borderLight, 1);
darkLogoBg.appendChild(logoDark);
logoDark.x = 61;
logoDark.y = 78;
lightLogoBg.appendChild(logoLight);
logoLight.x = 61;
logoLight.y = 78;
addText(darkLogoBg, 'Caption', 'Primary · dark background', 24, 382, 12, C.mutedDark, { mono: true });
addText(lightLogoBg, 'Caption', 'Primary · light background', 24, 382, 12, C.mutedLight, { mono: true });

const construction = sectionCard(logoPage.board, 'Construction', 72, 770, 1296, 370, false);
addText(construction, 'Title', 'Construcción exacta', 24, 24, 24, C.textLight, { style: 'Bold' });
addText(construction, 'Description', 'Altura maestra 1000u · O 1000×1000u · bracket 800×1000u · separación 240u · caja total 2040×1000u.', 24, 62, 14, C.mutedLight, { width: 1150, lineHeight: 22 });
const miniX = 60;
const miniY = 126;
const s = 0.17;
const outer = figma.createEllipse();
construction.appendChild(outer);
place(outer, miniX, miniY, LOGO.markSize * s, LOGO.markSize * s);
fill(outer, C.blueLight);
const inner = figma.createEllipse();
construction.appendChild(inner);
place(inner, miniX + LOGO.stroke * s, miniY + LOGO.stroke * s, (LOGO.markSize - LOGO.stroke * 2) * s, (LOGO.markSize - LOGO.stroke * 2) * s);
fill(inner, C.surfaceLight);
const bx = miniX + LOGO.bracketOffset * s;
LOGO.bracketPieces.forEach(([px,py,pw,ph], idx) => {
  addRect(construction, `Bracket grid / ${idx + 1}`, bx + px*s, miniY + py*s, pw*s, ph*s, C.textLight);
});
stroke(addFrame(construction, 'O bounds / 1000u', miniX, miniY, LOGO.markSize*s, LOGO.markSize*s, C.surfaceLight, 0), C.blueLight, 1);
construction.children[construction.children.length - 1].fills = [];
stroke(addFrame(construction, 'Bracket bounds / 800×1000u', bx, miniY, LOGO.bracketWidth*s, LOGO.markSize*s, C.surfaceLight, 0), C.blueLight, 1);
construction.children[construction.children.length - 1].fills = [];
addText(construction, 'Equal height', '1000u', 468, 142, 40, C.blueLight, { mono: true, style: 'Semi Bold' });
addText(construction, 'Rule', 'ANCHO ÓPTICO 80%', 468, 196, 12, C.textLight, { style: 'Semi Bold', letterSpacing: 1.2 });
addText(construction, 'Details', 'Trazo uniforme: 160u\nExtensiones: 420u\nSin remate ni color distinto', 468, 230, 14, C.mutedLight, { mono: true, lineHeight: 25, width: 300 });
addText(construction, 'Formula', '1000 + 240 + 800 = 2040u', 850, 168, 22, C.textLight, { mono: true, style: 'Semi Bold' });
addText(construction, 'Formula note', 'La proporción queda bloqueada. No escalar las partes por separado.', 850, 210, 14, C.mutedLight, { width: 350, lineHeight: 22 });

const usage = sectionCard(logoPage.board, 'Usage', 72, 1180, 1296, 820, false);
addText(usage, 'Title', 'Versiones y uso', 24, 24, 24, C.textLight, { style: 'Bold' });
const monoDark = addFrame(usage, 'Mono dark stage', 24, 82, 570, 282, C.canvasDark, 6);
monoDark.appendChild(logoMono);
logoMono.x = 101.4;
logoMono.y = 48;
const monoLightStage = addFrame(usage, 'Mono light stage', 626, 82, 570, 282, C.canvasSubtleLight, 6);
stroke(monoLightStage, C.borderLight, 1);
createLogoArtwork(monoLightStage, 'Logo artwork / Ink', 101.4, 60, 0.18, C.textLight, C.textLight);
addText(usage, 'Dark mono note', 'Blanco total', 24, 382, 12, C.mutedLight, { mono: true });
addText(usage, 'Light mono note', 'Ink total / primary light', 626, 382, 12, C.mutedLight, { mono: true });

label(usage, 'Clear space', 24, 450, C.blueLight, 200);
const safe = addFrame(usage, 'Clear space demonstration', 24, 486, 486, 250, C.canvasSubtleLight, 4);
stroke(safe, C.borderLight, 1);
createLogoArtwork(safe, 'Logo artwork / Clear space', 59.4, 35, 0.18, C.blueLight, C.textLight);
stroke(addFrame(safe, 'Safe area / 160u', 30.6, 6.2, 424.8, 237.6, C.surfaceLight, 0), C.blueLight, 1, 0.4);
safe.children[safe.children.length - 1].fills = [];
addText(usage, 'Clear space note', 'Mínimo: 160u alrededor\n(igual al grosor de la O)', 540, 514, 16, C.textLight, { lineHeight: 26, width: 270 });
label(usage, 'Minimum sizes', 868, 450, C.blueLight, 200);
addText(usage, 'Symbol size label', '32 px', 868, 506, 12, C.mutedLight, { mono: true });
createLogoArtwork(usage, 'Logo artwork / 32px', 930, 500, 0.032, C.blueLight, C.textLight);
addText(usage, 'Lockup size label', '120 px', 868, 574, 12, C.mutedLight, { mono: true });
createLogoArtwork(usage, 'Logo artwork / 120px', 946, 560, 120 / LOGO.totalWidth, C.blueLight, C.textLight);
addText(usage, 'Donts', 'NO deformar · NO usar degradados · NO separar alturas · NO cambiar la punta', 24, 760, 14, C.dangerLight, { style: 'Semi Bold', width: 1120 });
addText(logoPage.board, 'Footer', 'Fuente vectorial: dos operaciones booleanas, completamente editables.', 72, 2128, 12, C.mutedLight, { mono: true });

// Buttons.
figma.currentPage = buttonsPage.page;
titleBlock(buttonsPage.board, 'Components / 01', 'Buttons', 'Acciones claras, radios contenidos y foco visible. Cada estado es un componente editable.');
const darkButtons = addFrame(buttonsPage.board, 'Dark theme stage', 72, 292, 1296, 530, C.canvasDark, 8);
addText(darkButtons, 'Title', 'Dark theme', 28, 24, 24, C.textDark, { style: 'Bold' });
const states = ['default', 'hover', 'focus', 'disabled'];
states.forEach((state, index) => label(darkButtons, state, 280 + index * 220, 78, C.mutedDark, 160));
['primary', 'secondary', 'danger'].forEach((kind, row) => {
  addText(darkButtons, `Row / ${kind}`, kind[0].toUpperCase() + kind.slice(1), 28, 128 + row * 112, 14, C.textDark, { style: 'Semi Bold', width: 170 });
  states.forEach((state, col) => addButton(darkButtons, `Button/${kind}/Medium/${state}/Dark`, kind === 'primary' ? 'Crear torneo' : kind === 'secondary' ? 'Ver detalles' : 'Eliminar', 280 + col * 220, 116 + row * 112, kind, state, 'dark'));
});
const lightButtons = addFrame(buttonsPage.board, 'Light theme stage', 72, 862, 1296, 530, C.surfaceLight, 8);
stroke(lightButtons, C.borderLight, 1);
addText(lightButtons, 'Title', 'Light theme', 28, 24, 24, C.textLight, { style: 'Bold' });
states.forEach((state, index) => label(lightButtons, state, 280 + index * 220, 78, C.mutedLight, 160));
['primary', 'secondary', 'danger'].forEach((kind, row) => {
  addText(lightButtons, `Row / ${kind}`, kind[0].toUpperCase() + kind.slice(1), 28, 128 + row * 112, 14, C.textLight, { style: 'Semi Bold', width: 170 });
  states.forEach((state, col) => addButton(lightButtons, `Button/${kind}/Medium/${state}/Light`, kind === 'primary' ? 'Crear torneo' : kind === 'secondary' ? 'Ver detalles' : 'Eliminar', 280 + col * 220, 116 + row * 112, kind, state, 'light'));
});
addText(buttonsPage.board, 'Footer note', 'Alturas: Small 32 · Medium 40 · Focus ring 2 px + separación visible', 72, 1480, 12, C.mutedLight, { mono: true });

// Fields and badges.
figma.currentPage = fieldsPage.page;
titleBlock(fieldsPage.board, 'Components / 02', 'Fields & Badges', 'Los controles explican su estado sin ruido. Las etiquetas de estado nunca dependen solo del color.');
const fieldsLight = sectionCard(fieldsPage.board, 'Fields / Light', 72, 292, 1296, 530, false);
addText(fieldsLight, 'Title', 'Fields · Light', 28, 24, 24, C.textLight, { style: 'Bold' });
const fieldStates = ['default', 'focus', 'error', 'disabled'];
fieldStates.forEach((state, index) => {
  label(fieldsLight, state, 28 + index * 310, 82, C.mutedLight, 250);
  addField(fieldsLight, `Field/Input/${state}/Light`, 'Nombre del torneo', state === 'error' ? 'Copa' : 'Copa Open 2026', 28 + index * 310, 120, 270, state, 'light');
});
addField(fieldsLight, 'Field/Textarea/Default/Light', 'Descripción', 'Explicá las reglas y el formato del torneo.', 28, 280, 580, 'default', 'light', true);
addField(fieldsLight, 'Field/Select/Focus/Light', 'Formato', 'Eliminación directa', 650, 280, 300, 'focus', 'light');

const fieldsDark = addFrame(fieldsPage.board, 'Fields / Dark', 72, 862, 1296, 390, C.canvasDark, 8);
addText(fieldsDark, 'Title', 'Fields · Dark', 28, 24, 24, C.textDark, { style: 'Bold' });
fieldStates.forEach((state, index) => {
  label(fieldsDark, state, 28 + index * 310, 82, C.mutedDark, 250);
  addField(fieldsDark, `Field/Input/${state}/Dark`, 'Código de acceso', state === 'error' ? 'OT-2' : 'OT-2048', 28 + index * 310, 120, 270, state, 'dark');
});

const badges = sectionCard(fieldsPage.board, 'Badges', 72, 1292, 1296, 330, false);
addText(badges, 'Title', 'Badges', 28, 24, 24, C.textLight, { style: 'Bold' });
const badgeDefs = [
  ['Neutral', C.canvasSubtleLight, C.textLight, C.borderLight],
  ['Primary', '#E9EFFF', C.blueLight, '#C8D7FF'],
  ['Success', '#E8F6EE', C.successLight, '#BFE6CF'],
  ['Warning', '#FFF4DB', C.warningLight, '#F2D59A'],
  ['Danger', '#FDEBEC', C.dangerLight, '#F2C4C7'],
];
badgeDefs.forEach(([name, bg, fg, border], index) => addBadge(badges, `Badge/${name}/Light`, name, 28 + index * 160, 92, bg, fg, border));
addBadge(badges, 'Badge/Live/Dark', 'EN VIVO', 28, 166, '#3A171B', '#FF9AA0', '#6E2B31');
addBadge(badges, 'Badge/Final/Dark', 'FINAL', 150, 166, C.surfaceRaisedDark, C.textDark, C.borderDark);
addText(badges, 'Guidance', 'Texto + color: “EN VIVO”, “FINAL”, “ERROR”. Nunca una pastilla cromática sin significado escrito.', 28, 230, 14, C.mutedLight, { width: 1040, lineHeight: 22 });

// Cards.
figma.currentPage = cardsPage.page;
titleBlock(cardsPage.board, 'Components / 03', 'Cards & Panels', 'Superficies contenidas: jerarquía por borde, fondo y elevación; no por radios exagerados.');
const cardStage = addFrame(cardsPage.board, 'Cards / Light stage', 72, 292, 1296, 480, C.canvasSubtleLight, 8);
const basePanel = addPanel(cardStage, 'Card/Base/Light', 32, 54, 368, 336, 'light', false);
addText(basePanel, 'Eyebrow', 'TORNEO ABIERTO', 24, 24, 11, C.blueLight, { style: 'Semi Bold', letterSpacing: 1.1 });
addText(basePanel, 'Title', 'Copa Open 2026', 24, 58, 24, C.textLight, { style: 'Bold' });
addText(basePanel, 'Body', '32 participantes · eliminación directa · registro abierto.', 24, 102, 14, C.mutedLight, { width: 310, lineHeight: 22 });
addBadge(basePanel, 'Badge/Registration', 'REGISTRO', 24, 176, '#E9EFFF', C.blueLight, '#C8D7FF');
addButton(basePanel, 'Button/Primary/Small/Default/Light', 'Abrir torneo', 24, 252, 'primary', 'default', 'light', 'small');

const raisedPanel = addPanel(cardStage, 'Card/Raised/Light', 432, 54, 368, 336, 'light', true);
addText(raisedPanel, 'Eyebrow', 'FEATURED', 24, 24, 11, C.blueLight, { style: 'Semi Bold', letterSpacing: 1.1 });
addText(raisedPanel, 'Title', 'Final comunitaria', 24, 58, 24, C.textLight, { style: 'Bold' });
addText(raisedPanel, 'Body', 'Todo lo importante, sin ornamentación que compita con los datos.', 24, 102, 14, C.mutedLight, { width: 310, lineHeight: 22 });
addRect(raisedPanel, 'Feature line', 24, 190, 320, 3, C.blueLight, 1.5);
addText(raisedPanel, 'Meta', 'SÁBADO · 19:00', 24, 220, 12, C.mutedLight, { mono: true });

const featurePanel = addPanel(cardStage, 'Card/Feature/Light', 832, 54, 432, 336, 'light', false);
fill(featurePanel, C.textLight);
stroke(featurePanel, C.textLight, 1);
addText(featurePanel, 'Eyebrow', 'OPEN SOURCE', 24, 24, 11, C.blueDark, { style: 'Semi Bold', letterSpacing: 1.1 });
addText(featurePanel, 'Title', 'La competencia también puede ser infraestructura pública.', 24, 58, 28, C.textDark, { style: 'Bold', lineHeight: 34, width: 378 });
addText(featurePanel, 'Body', 'Reglas visibles. Herramientas auditables. Comunidad primero.', 24, 184, 14, C.mutedDark, { width: 350, lineHeight: 22 });

const darkCardStage = addFrame(cardsPage.board, 'Cards / Dark stage', 72, 822, 1296, 470, C.canvasDark, 8);
const darkPanel = addPanel(darkCardStage, 'Card/Base/Dark', 32, 54, 590, 320, 'dark', false);
addText(darkPanel, 'Title', 'Panel operativo', 24, 24, 24, C.textDark, { style: 'Bold' });
addText(darkPanel, 'Body', 'Los datos mandan. La superficie separa contexto sin fingir profundidad innecesaria.', 24, 68, 14, C.mutedDark, { width: 500, lineHeight: 22 });
addLine(darkPanel, 'Divider', 24, 136, 542, C.borderDark, 1);
addText(darkPanel, 'Metric', '16', 24, 166, 42, C.textDark, { style: 'Bold', mono: true });
addText(darkPanel, 'Metric label', 'PARTIDOS PENDIENTES', 24, 222, 11, C.mutedDark, { style: 'Semi Bold', letterSpacing: 1.1 });
const darkRaised = addPanel(darkCardStage, 'Card/Raised/Dark', 654, 54, 610, 320, 'dark', true);
addText(darkRaised, 'Title', 'Elevación mínima', 24, 24, 24, C.textDark, { style: 'Bold' });
addText(darkRaised, 'Body', 'Usar solo cuando el panel necesita prioridad real sobre su contexto.', 24, 68, 14, C.mutedDark, { width: 520, lineHeight: 22 });
addBadge(darkRaised, 'Badge/Attention/Dark', 'ATENCIÓN', 24, 148, '#3A2D14', '#F6C75B', '#6E5323');

// Navigation.
figma.currentPage = navigationPage.page;
titleBlock(navigationPage.board, 'Components / 04', 'Header & Navigation', 'La navegación pone la identidad en servicio del producto. El símbolo nunca roba espacio al contenido.');
const headerDark = figma.createComponent();
headerDark.name = 'Header/Authenticated/Dark';
navigationPage.board.appendChild(headerDark);
place(headerDark, 72, 322, 1296, 88);
fill(headerDark, C.canvasDark);
stroke(headerDark, C.borderDark, 1);
createLogoArtwork(headerDark, 'Logo artwork / Header dark', 24, 24, 0.04, C.blueDark, C.textDark);
addText(headerDark, 'Wordmark', 'OpenTournament', 124, 29, 18, C.textDark, { style: 'Bold' });
addText(headerDark, 'Nav / Tournaments', 'Torneos', 402, 34, 14, C.textDark, { style: 'Semi Bold' });
addText(headerDark, 'Nav / Matches', 'Partidos', 506, 34, 14, C.mutedDark, { style: 'Semi Bold' });
addText(headerDark, 'Nav / Community', 'Comunidad', 604, 34, 14, C.mutedDark, { style: 'Semi Bold' });
addRect(headerDark, 'Active nav', 402, 65, 57, 2, C.blueDark, 1);
addButton(headerDark, 'Button/Secondary/Small/Default/Dark', 'Panel', 1070, 28, 'secondary', 'default', 'dark', 'small');
addRect(headerDark, 'Avatar', 1198, 28, 32, 32, C.blueDark, 16);
addText(headerDark, 'Avatar initials', 'DE', 1206, 37, 11, '#FFFFFF', { style: 'Bold' });

const headerGuest = figma.createComponent();
headerGuest.name = 'Header/Guest/Light';
navigationPage.board.appendChild(headerGuest);
place(headerGuest, 72, 458, 1296, 88);
fill(headerGuest, C.surfaceLight);
stroke(headerGuest, C.borderLight, 1);
createLogoArtwork(headerGuest, 'Logo artwork / Header light', 24, 24, 0.04, C.blueLight, C.textLight);
addText(headerGuest, 'Wordmark', 'OpenTournament', 124, 29, 18, C.textLight, { style: 'Bold' });
addText(headerGuest, 'Nav / Explore', 'Explorar', 484, 34, 14, C.textLight, { style: 'Semi Bold' });
addText(headerGuest, 'Nav / Docs', 'Documentación', 584, 34, 14, C.mutedLight, { style: 'Semi Bold' });
addButton(headerGuest, 'Button/Secondary/Small/Default/Light', 'Ingresar', 1042, 28, 'secondary', 'default', 'light', 'small');
addButton(headerGuest, 'Button/Primary/Small/Default/Light', 'Crear torneo', 1152, 28, 'primary', 'default', 'light', 'small');

const navRules = sectionCard(navigationPage.board, 'Navigation rules', 72, 610, 1296, 560, false);
addText(navRules, 'Title', 'Reglas de navegación', 28, 24, 24, C.textLight, { style: 'Bold' });
const rules = [
  ['01', 'Símbolo compacto', '40 px de alto en desktop. A 16 px, usar solo la O.'],
  ['02', 'Una acción primaria', 'El header no compite con el objetivo principal de cada pantalla.'],
  ['03', 'Estado activo visible', 'Texto + línea de 2 px. No depender de un cambio de color mínimo.'],
  ['04', 'Datos primero', 'La marca abre la experiencia; después cede espacio al torneo.'],
];
rules.forEach(([number, ruleTitle, body], index) => {
  const yy = 96 + index * 104;
  addText(navRules, `Rule ${number}`, number, 28, yy, 14, C.blueLight, { mono: true, style: 'Semi Bold' });
  addText(navRules, `Rule title ${number}`, ruleTitle, 84, yy, 18, C.textLight, { style: 'Semi Bold' });
  addText(navRules, `Rule body ${number}`, body, 340, yy, 14, C.mutedLight, { width: 820, lineHeight: 22 });
  if (index < rules.length - 1) addLine(navRules, `Rule divider ${number}`, 28, yy + 72, 1240, C.borderLight, 1);
});

// Match cards.
function createMatchCard(parent, name, x, y, status, theme = 'light') {
  const dark = theme === 'dark';
  const component = addPanel(parent, name, x, y, 580, 272, theme, status === 'live');
  const text = dark ? C.textDark : C.textLight;
  const muted = dark ? C.mutedDark : C.mutedLight;
  const border = dark ? C.borderDark : C.borderLight;
  const statusDefs = {
    scheduled: ['PROGRAMADO', dark ? C.surfaceRaisedDark : C.canvasSubtleLight, muted, border],
    live: ['EN VIVO', dark ? '#3A171B' : '#FDEBEC', dark ? '#FF9AA0' : C.dangerLight, dark ? '#6E2B31' : '#F2C4C7'],
    final: ['FINAL', dark ? C.surfaceRaisedDark : C.canvasSubtleLight, text, border],
  };
  const [statusText, bg, fg, bd] = statusDefs[status];
  addBadge(component, `Status/${status}`, statusText, 24, 20, bg, fg, bd);
  addText(component, 'Round', 'SEMIFINAL · BO3', 388, 27, 11, muted, { mono: true, width: 168, align: 'RIGHT' });
  addLine(component, 'Divider top', 24, 62, 532, border, 1);
  addText(component, 'Team A', 'NODO NORTE', 24, 88, 16, text, { style: 'Semi Bold' });
  addText(component, 'Score A', status === 'scheduled' ? '—' : status === 'live' ? '1' : '2', 492, 82, 28, text, { style: 'Bold', mono: true, width: 64, align: 'RIGHT' });
  addText(component, 'Team B', 'COMUNIDAD SUR', 24, 138, 16, text, { style: 'Semi Bold' });
  addText(component, 'Score B', status === 'scheduled' ? '—' : status === 'live' ? '0' : '1', 492, 132, 28, text, { style: 'Bold', mono: true, width: 64, align: 'RIGHT' });
  addLine(component, 'Divider bottom', 24, 188, 532, border, 1);
  addText(component, 'Meta', status === 'scheduled' ? '28 AGO · 19:00' : status === 'live' ? 'MAPA 2 · 08:42' : 'FINALIZADO · 21:16', 24, 214, 12, muted, { mono: true });
  if (status === 'live') addRect(component, 'Live indicator', 532, 222, 8, 8, dark ? C.dangerDark : C.dangerLight, 4);
  return component;
}

figma.currentPage = matchesPage.page;
titleBlock(matchesPage.board, 'Components / 05', 'Match Cards', 'La competencia se entiende de un vistazo: estado, ronda, equipos, marcador y tiempo.');
const matchLight = sectionCard(matchesPage.board, 'Match cards / Light', 72, 292, 1296, 720, false);
addText(matchLight, 'Title', 'Light theme', 28, 24, 24, C.textLight, { style: 'Bold' });
createMatchCard(matchLight, 'MatchCard/Scheduled/Light', 28, 84, 'scheduled', 'light');
createMatchCard(matchLight, 'MatchCard/Live/Light', 656, 84, 'live', 'light');
createMatchCard(matchLight, 'MatchCard/Final/Light', 28, 392, 'final', 'light');

const matchDark = addFrame(matchesPage.board, 'Match cards / Dark', 72, 1052, 1296, 440, C.canvasDark, 8);
addText(matchDark, 'Title', 'Dark theme', 28, 24, 24, C.textDark, { style: 'Bold' });
createMatchCard(matchDark, 'MatchCard/Live/Dark', 28, 84, 'live', 'dark');
createMatchCard(matchDark, 'MatchCard/Final/Dark', 656, 84, 'final', 'dark');
addText(matchesPage.board, 'Footer note', 'Componente de referencia · datos ficticios · preparado para Scheduled / Live / Final', 72, 1576, 12, C.mutedLight, { mono: true });

// Final metadata and starting view.
figma.currentPage = initialPage;
figma.viewport.scrollAndZoomIntoView([coverBoard]);
figma.currentPage.selection = [coverBoard];
console.log(JSON.stringify({
  pages: figma.root.children.map((page) => page.name),
  components: figma.root.findAll((node) => node.type === 'COMPONENT').length,
  booleanOperations: figma.root.findAll((node) => node.type === 'BOOLEAN_OPERATION').length,
}));
