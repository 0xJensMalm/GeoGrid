// GeoGrid - Vertex-based geometric pattern generator
// Square cells guaranteed for any aspect ratio.

let gridSize = 10;
let pattern = null;

let currentThemeId = 'olive';
let complexity = 2;
let showGrid = true;

let seed;

// Aspect ratio modes affect canvas size and grid shape, but never cell stretching
let aspectMode = 'square'; // 'square' | 'landscape' | 'portrait'

// Background is a real color value (black + theme palette)
let bgColor = '#000000'; // default black

// Derived grid dims (rows/cols)
let gridCols = 10;
let gridRows = 10;

function setup() {
  seed = Math.floor(Math.random() * 999999999);

  const { w, h } = getCanvasSizeForAspect();
  const canvas = createCanvas(w, h);
  canvas.parent('canvas-container');

  noLoop();

  generatePattern();
  setupControls();

  recalcGridDims();
  refreshThemeUI();
  updateHashDisplay();
}

function draw() {
  const colors = getThemeColors();

  // Canvas background
  background(bgColor);

  // Frame background (outside canvas)
  document.body.style.backgroundColor = bgColor;

  // Signature color: white-ish on black, black-ish on any other background
  const signature = document.getElementById('signature');
  if (signature) {
    const isBlack = (bgColor || '').toLowerCase() === '#000000';
    signature.style.setProperty('--sig-color', isBlack ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.55)');
  }

  // Compute square cell size that fits BOTH axes
  const cellSize = Math.min(width / gridCols, height / gridRows);

  // Center the grid so empty margins are symmetric
  const gridW = cellSize * gridCols;
  const gridH = cellSize * gridRows;
  const offsetX = (width - gridW) / 2;
  const offsetY = (height - gridH) / 2;

  // Draw cells
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      push();
      translate(offsetX + col * cellSize, offsetY + row * cellSize);
      drawCell(cellSize, colors);
      pop();
    }
  }

  // Optional grid overlay
  if (showGrid && Math.max(gridCols, gridRows) <= 40) {
    stroke(255, 15);
    strokeWeight(0.5);
    noFill();

    for (let r = 0; r <= gridRows; r++) {
      const y = offsetY + r * cellSize;
      line(offsetX, y, offsetX + gridW, y);
    }
    for (let c = 0; c <= gridCols; c++) {
      const x = offsetX + c * cellSize;
      line(x, offsetY, x, offsetY + gridH);
    }
  }

  updateSignature();
}

// ---------- Themes ----------
function getThemeColors() {
  const t = window.THEMES_BY_ID?.[currentThemeId] ?? window.THEME_LIST?.[0];
  return t?.colors ?? ['#111', '#333', '#666', '#999', '#eee'];
}

function getThemeIndexById(id) {
  const idx = window.THEME_LIST.findIndex(t => t.id === id);
  return idx >= 0 ? idx : 0;
}

function setThemeByIndex(idx) {
  const t = window.THEME_LIST[clampInt(idx, 0, window.THEME_LIST.length - 1)];
  currentThemeId = t.id;
}

function getBackgroundPalette() {
  // Black first + theme colors
  return ['#000000', ...getThemeColors()];
}

// ---------- Aspect ratio / canvas sizing ----------
function getCanvasSizeForAspect() {
  const baseH = Math.floor(windowHeight * 0.70);

  if (aspectMode === 'landscape') {
    // 3:2
    return { w: Math.floor(baseH * 1.5), h: baseH };
  }
  if (aspectMode === 'portrait') {
    // 2:3
    return { w: Math.floor(baseH * (2 / 3)), h: baseH };
  }
  return { w: baseH, h: baseH };
}

function recalcGridDims() {
  if (aspectMode === 'landscape') {
    gridRows = gridSize;
    gridCols = Math.round(gridSize * 1.5);
  } else if (aspectMode === 'portrait') {
    gridCols = gridSize;
    gridRows = Math.round(gridSize * 1.5);
  } else {
    gridCols = gridSize;
    gridRows = gridSize;
  }

  gridCols = Math.max(2, gridCols);
  gridRows = Math.max(2, gridRows);
}

// ---------- Hash ----------
function generateHash() {
  const themeIndex = getThemeIndexById(currentThemeId);

  const aspectIndex =
    aspectMode === 'square' ? 0 :
    aspectMode === 'landscape' ? 1 :
    2;

  const bgPalette = getBackgroundPalette();
  let bgIdx = bgPalette.findIndex(c => c.toLowerCase() === bgColor.toLowerCase());
  if (bgIdx < 0) bgIdx = 0;

  // seed-theme-complexity-aspect-bgIndex
  return `${seed.toString(36)}-${themeIndex.toString(36)}-${complexity.toString(36)}-${aspectIndex.toString(36)}-${bgIdx.toString(36)}`;
}

function parseHash(hash) {
  try {
    const parts = hash.split('-');
    if (parts.length < 3) return false;

    const newSeed = parseInt(parts[0], 36);
    const themeIndex = parseInt(parts[1], 36);
    const newComplexity = parseInt(parts[2], 36);

    const aspectIndex = parts.length >= 4 ? parseInt(parts[3], 36) : 0;
    const newBgIndex = parts.length >= 5 ? parseInt(parts[4], 36) : 0;

    if (isNaN(newSeed) || isNaN(themeIndex) || isNaN(newComplexity)) return false;
    if (newComplexity < 1 || newComplexity > 5) return false;
    if (themeIndex < 0 || themeIndex >= window.THEME_LIST.length) return false;

    seed = newSeed;
    setThemeByIndex(themeIndex);
    complexity = newComplexity;

    aspectMode =
      aspectIndex === 1 ? 'landscape' :
      aspectIndex === 2 ? 'portrait' :
      'square';

    // Background from: [black + theme colors]
    const bgPalette = getBackgroundPalette();
    const safeBgIndex = clampInt(
      isNaN(newBgIndex) ? 0 : newBgIndex,
      0,
      bgPalette.length - 1
    );
    bgColor = bgPalette[safeBgIndex];

    return true;
  } catch (e) {
    console.error('Invalid hash:', e);
    return false;
  }
}

function updateHashDisplay() {
  const hashInput = document.getElementById('seedHash');
  if (hashInput) hashInput.value = generateHash();
}

// ---------- Signature ----------
function updateSignature() {
  const sigHash = document.getElementById('sigHash');
  const sigColors = document.getElementById('sigColors');

  if (sigHash) sigHash.textContent = generateHash();

  if (sigColors) {
    const colors = getThemeColors();
    sigColors.innerHTML = '';
    for (const color of colors) {
      const swatch = document.createElement('div');
      swatch.className = 'sig-color-swatch';
      swatch.style.backgroundColor = color;
      sigColors.appendChild(swatch);
    }
  }
}

// ---------- Pattern generation ----------
function generatePattern() {
  randomSeed(seed);

  const gridRes = complexity + 1;

  pattern = {
    gridRes,
    triangles: [],
  };

  for (let row = 0; row < gridRes - 1; row++) {
    for (let col = 0; col < gridRes - 1; col++) {
      const x0 = col / (gridRes - 1);
      const y0 = row / (gridRes - 1);
      const x1 = (col + 1) / (gridRes - 1);
      const y1 = (row + 1) / (gridRes - 1);

      const tl = { x: x0, y: y0 };
      const tr = { x: x1, y: y0 };
      const bl = { x: x0, y: y1 };
      const br = { x: x1, y: y1 };

      const diagDirection = random() > 0.5;

      const colorIdx1 = floor(random(8));
      const colorIdx2 = floor(random(8));

      if (diagDirection) {
        pattern.triangles.push({ vertices: [tl, tr, br], colorIndex: colorIdx1 });
        pattern.triangles.push({ vertices: [tl, br, bl], colorIndex: colorIdx2 });
      } else {
        pattern.triangles.push({ vertices: [tl, tr, bl], colorIndex: colorIdx1 });
        pattern.triangles.push({ vertices: [tr, br, bl], colorIndex: colorIdx2 });
      }
    }
  }

  updateHashDisplay();
}

function drawCell(size, colors) {
  noStroke();
  for (const tri of pattern.triangles) {
    fill(colors[tri.colorIndex % colors.length]);
    beginShape();
    for (const v of tri.vertices) vertex(v.x * size, v.y * size);
    endShape(CLOSE);
  }
}

// ---------- Controls ----------
function setupControls() {
  // Populate theme select from THEME_LIST
  const themeSelect = document.getElementById('theme');
  themeSelect.innerHTML = '';
  for (const t of window.THEME_LIST) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    themeSelect.appendChild(opt);
  }
  themeSelect.value = currentThemeId;

  // Grid size
  const gridSlider = document.getElementById('gridSize');
  const gridValue = document.getElementById('gridSizeValue');
  gridSlider.addEventListener('input', (e) => {
    gridSize = parseInt(e.target.value);
    gridValue.textContent = gridSize;
    recalcGridDims();
    redraw();
  });

  // Aspect ratio
  const aspectSelect = document.getElementById('aspect');
  aspectSelect.value = aspectMode;
  aspectSelect.addEventListener('change', (e) => {
    aspectMode = e.target.value;
    recalcGridDims();
    resizeToAspect();
    refreshThemeUI(); // ensures bg palette is consistent
    updateHashDisplay();
    redraw();
  });

  // Theme
  themeSelect.addEventListener('change', (e) => {
    currentThemeId = e.target.value;

    // If current bgColor isn't in new palette, fall back to black
    const palette = getBackgroundPalette();
    if (!palette.some(c => c.toLowerCase() === bgColor.toLowerCase())) {
      bgColor = '#000000';
    }

    refreshThemeUI();
    updateHashDisplay();
    redraw();
  });

  // Complexity
  const complexitySlider = document.getElementById('complexity');
  const complexityValue = document.getElementById('complexityValue');
  complexitySlider.addEventListener('input', (e) => {
    complexity = parseInt(e.target.value);
    complexityValue.textContent = complexity;
    generatePattern();
    redraw();
  });

  // Show grid
  const gridCheckbox = document.getElementById('showGrid');
  gridCheckbox.addEventListener('change', (e) => {
    showGrid = e.target.checked;
    redraw();
  });

  // Generate new
  const generateBtn = document.getElementById('generate');
  generateBtn.addEventListener('click', () => {
    seed = Math.floor(Math.random() * 999999999);
    generatePattern();
    updateHashDisplay();
    redraw();
  });

  // Save section
  const saveBtn = document.getElementById('save');
  const saveOptions = document.getElementById('save-options');
  const confirmSave = document.getElementById('confirmSave');
  const cancelSave = document.getElementById('cancelSave');
  const resWidthInput = document.getElementById('resWidth');
  const resHeightInput = document.getElementById('resHeight');

  saveBtn.addEventListener('click', () => {
    saveBtn.classList.add('hidden');
    saveOptions.classList.remove('hidden');
    resWidthInput.focus();
    resWidthInput.select();
  });

  cancelSave.addEventListener('click', () => {
    saveOptions.classList.add('hidden');
    saveBtn.classList.remove('hidden');
  });

  confirmSave.addEventListener('click', () => {
    const resWidth = parseInt(resWidthInput.value) || 2048;
    const resHeight = parseInt(resHeightInput.value) || 2048;
    exportHighRes(resWidth, resHeight);
    saveOptions.classList.add('hidden');
    saveBtn.classList.remove('hidden');
  });

  const handleResKeypress = (e) => {
    if (e.key === 'Enter') confirmSave.click();
  };
  resWidthInput.addEventListener('keypress', handleResKeypress);
  resHeightInput.addEventListener('keypress', handleResKeypress);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !saveOptions.classList.contains('hidden')) cancelSave.click();
  });

  // Copy hash
  const copyBtn = document.getElementById('copyHash');
  copyBtn.addEventListener('click', () => {
    const hashInput = document.getElementById('seedHash');
    navigator.clipboard.writeText(hashInput.value).then(() => {
      copyBtn.textContent = '✓';
      setTimeout(() => { copyBtn.textContent = '⎘'; }, 1500);
    });
  });

  // Load from hash
  const loadBtn = document.getElementById('loadBtn');
  const loadInput = document.getElementById('loadHash');

  loadBtn.addEventListener('click', () => {
    const hash = loadInput.value.trim();
    if (hash && parseHash(hash)) {
      // sync UI
      document.getElementById('theme').value = currentThemeId;
      document.getElementById('complexity').value = complexity;
      document.getElementById('complexityValue').textContent = complexity;
      document.getElementById('aspect').value = aspectMode;

      recalcGridDims();
      resizeToAspect();
      generatePattern();
      refreshThemeUI();
      updateHashDisplay();
      redraw();

      loadInput.value = '';
    } else {
      loadInput.style.borderColor = '#ff4444';
      setTimeout(() => { loadInput.style.borderColor = ''; }, 1500);
    }
  });

  loadInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadBtn.click();
  });
}

function refreshThemeUI() {
  refreshBgSwatches();
  updateSignature();
  document.body.style.backgroundColor = bgColor;
}

function refreshBgSwatches() {
  const palette = getBackgroundPalette();
  const wrap = document.getElementById('bgSwatches');
  if (!wrap) return;

  wrap.innerHTML = '';

  palette.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'bg-swatch' + (c.toLowerCase() === bgColor.toLowerCase() ? ' active' : '');
    div.style.backgroundColor = c;
    div.title = `Background: ${c}`;

    div.addEventListener('click', () => {
      bgColor = c;
      document.body.style.backgroundColor = bgColor;
      updateHashDisplay();
      refreshBgSwatches();
      redraw();
    });

    wrap.appendChild(div);
  });
}

// ---------- Resize ----------
function resizeToAspect() {
  const { w, h } = getCanvasSizeForAspect();
  resizeCanvas(w, h);
}

function windowResized() {
  resizeToAspect();
  redraw();
}

// ---------- Keyboard shortcuts ----------
function keyPressed() {
  if (key === 'n' || key === 'N') {
    seed = Math.floor(Math.random() * 999999999);
    generatePattern();
    updateHashDisplay();
    redraw();
  }
  if (key === 's' || key === 'S') {
    document.getElementById('save').click();
  }
  if (key === 'c' || key === 'C') {
    const hashInput = document.getElementById('seedHash');
    navigator.clipboard.writeText(hashInput.value);
  }
}

// ---------- Export ----------
function exportHighRes(resWidth, resHeight) {
  const pg = createGraphics(resWidth, resHeight);

  const colors = getThemeColors();

  // IMPORTANT: set the offscreen buffer background
  pg.background(bgColor);

  const cellSize = Math.min(resWidth / gridCols, resHeight / gridRows);
  const gridW = cellSize * gridCols;
  const gridH = cellSize * gridRows;
  const offsetX = (resWidth - gridW) / 2;
  const offsetY = (resHeight - gridH) / 2;

  pg.push();
  pg.translate(offsetX, offsetY);

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      pg.push();
      pg.translate(col * cellSize, row * cellSize);

      pg.noStroke();
      for (const tri of pattern.triangles) {
        pg.fill(colors[tri.colorIndex % colors.length]);
        pg.beginShape();
        for (const v of tri.vertices) pg.vertex(v.x * cellSize, v.y * cellSize);
        pg.endShape(CLOSE);
      }

      pg.pop();
    }
  }

  if (showGrid && Math.max(gridCols, gridRows) <= 40) {
    pg.stroke(255, 15);
    pg.strokeWeight(Math.min(resWidth, resHeight) / 1000);
    pg.noFill();

    for (let r = 0; r <= gridRows; r++) pg.line(0, r * cellSize, gridW, r * cellSize);
    for (let c = 0; c <= gridCols; c++) pg.line(c * cellSize, 0, c * cellSize, gridH);
  }

  pg.pop();

  pg.save(`geogrid-${generateHash()}-${resWidth}x${resHeight}.png`);
  pg.remove();
}

// ---------- Utils ----------
function clampInt(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.floor(v)));
}

function isBlackHex(hex) {
  return (hex || '').toLowerCase() === '#000000';
}