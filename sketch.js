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

// Keep a handle to the real canvas DOM element for layout calculations
let canvasEl = null;

function setup() {
  seed = Math.floor(Math.random() * 999999999);

  const { w, h } = getCanvasSizeForAspect();
  const canvas = createCanvas(w, h);
  canvas.parent('canvas-container');
  canvasEl = canvas.elt;

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

  // Signature color: subtle light on black bg; real black on non-black bg
  applySignatureColorForBg();

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

  // After signature content exists, align + position it
  syncSignatureLayout();
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

// ---------- Signature color ----------
function applySignatureColorForBg() {
  const signature = document.getElementById('signature');
  if (!signature) return;

  const isBlack = (bgColor || '').toLowerCase() === '#000000';

  // Clear contrast:
  // - black bg: subtle light
  // - non-black bg: real black
  const c = isBlack ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.88)';

  signature.style.setProperty('--sig-color', c);
  signature.style.color = c;
}

// Keep signature aligned to canvas width and halfway between canvas bottom and wrapper bottom
function syncSignatureLayout() {
  const wrapper = document.getElementById('artwork-wrapper');
  const signature = document.getElementById('signature');
  if (!wrapper || !signature || !canvasEl) return;

  const wRect = wrapper.getBoundingClientRect();
  const cRect = canvasEl.getBoundingClientRect();

  // Align signature width to canvas width
  const cw = Math.round(cRect.width);
  signature.style.width = `${cw}px`;
  signature.style.maxWidth = `${cw}px`;
  signature.style.justifyContent = 'space-between';

  // Place signature halfway between canvas bottom and wrapper bottom
  const freeSpace = wRect.bottom - cRect.bottom;
  const sigH = signature.getBoundingClientRect().height;

  let mt = (freeSpace - sigH) / 2;
  if (!isFinite(mt)) return;

  // Clamp so it never collapses too tight
  mt = Math.max(18, mt);

  signature.style.marginTop = `${Math.round(mt)}px`;
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

    applySignatureColorForBg();
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
    refreshThemeUI();
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
  applySignatureColorForBg();
  document.body.style.backgroundColor = bgColor;
  syncSignatureLayout();
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
      applySignatureColorForBg(); // immediate update
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
async function exportHighRes(resWidth, resHeight) {
  const wrapper = document.getElementById('artwork-wrapper');
  const canvasContainer = document.getElementById('canvas-container');
  const signature = document.getElementById('signature');

  if (!wrapper || !canvasContainer || !signature || !window.html2canvas) {
    console.error('Export failed: missing DOM nodes or html2canvas');
    return;
  }

  // Save current inline styles so we can restore
  const prevWrapperStyle = wrapper.getAttribute('style') || '';
  const prevCanvasContainerStyle = canvasContainer.getAttribute('style') || '';
  const prevSignatureStyle = signature.getAttribute('style') || '';
  const prevBodyStyle = document.body.getAttribute('style') || '';
  const prevHtmlStyle = document.documentElement.getAttribute('style') || '';

  // Stop body flex-centering + overflow clipping during capture
  document.documentElement.style.width = `${resWidth}px`;
  document.documentElement.style.height = `${resHeight}px`;

  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.display = 'block';
  document.body.style.justifyContent = 'unset';
  document.body.style.alignItems = 'unset';
  document.body.style.overflow = 'visible';
  document.body.style.backgroundColor = bgColor;

  // Ensure signature color is correct before capture
  applySignatureColorForBg();

  // Export layout knobs (pixels)
  const padX = Math.round(resWidth * 0.06);
  const padTop = Math.round(resHeight * 0.06);
  const padBottom = Math.round(resHeight * 0.10); // extra breathing room at bottom

  // Pin wrapper to top-left and make it EXACT output size
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.transform = 'none';
  wrapper.style.width = `${resWidth}px`;
  wrapper.style.height = `${resHeight}px`;
  wrapper.style.padding = `${padTop}px ${padX}px ${padBottom}px ${padX}px`;
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'flex-start';
  wrapper.style.boxSizing = 'border-box';

  // Canvas container fills the remaining area; signature will be positioned by syncSignatureLayout()
  const availableW = resWidth - padX * 2;

  // Give canvas container a generous height; signature spacing is computed later
  const availableH = resHeight - padTop - padBottom;
  canvasContainer.style.width = `${availableW}px`;
  canvasContainer.style.height = `${Math.max(100, Math.round(availableH * 0.78))}px`;
  canvasContainer.style.display = 'flex';
  canvasContainer.style.alignItems = 'center';
  canvasContainer.style.justifyContent = 'center';

  // Resize p5 canvas to fit inside canvasContainer while preserving aspect
  const targetAspect =
    aspectMode === 'landscape' ? 3 / 2 :
    aspectMode === 'portrait' ? 2 / 3 :
    1;

  let cw = availableW;
  let ch = Math.round(cw / targetAspect);

  const maxCanvasH = Math.max(100, Math.round(availableH * 0.78));
  if (ch > maxCanvasH) {
    ch = maxCanvasH;
    cw = Math.round(ch * targetAspect);
  }

  resizeCanvas(cw, ch);
  redraw();

  // After canvas is resized and signature text is updated, align + position signature
  syncSignatureLayout();
  applySignatureColorForBg();

  // Let layout settle
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // Capture wrapper
  const captureCanvas = await html2canvas(wrapper, {
    backgroundColor: bgColor,
    scale: 1,
    useCORS: true,
    allowTaint: true,
    logging: false,
  });

  // Normalize to exact requested size (safety)
  const out = document.createElement('canvas');
  out.width = resWidth;
  out.height = resHeight;
  const ctx = out.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, resWidth, resHeight);
  ctx.drawImage(captureCanvas, 0, 0, resWidth, resHeight);

  // Download
  const a = document.createElement('a');
  a.download = `geogrid-${generateHash()}-${resWidth}x${resHeight}.png`;
  a.href = out.toDataURL('image/png');
  a.click();

  // Restore everything
  if (prevWrapperStyle) wrapper.setAttribute('style', prevWrapperStyle);
  else wrapper.removeAttribute('style');

  if (prevCanvasContainerStyle) canvasContainer.setAttribute('style', prevCanvasContainerStyle);
  else canvasContainer.removeAttribute('style');

  if (prevSignatureStyle) signature.setAttribute('style', prevSignatureStyle);
  else signature.removeAttribute('style');

  if (prevBodyStyle) document.body.setAttribute('style', prevBodyStyle);
  else document.body.removeAttribute('style');

  if (prevHtmlStyle) document.documentElement.setAttribute('style', prevHtmlStyle);
  else document.documentElement.removeAttribute('style');

  // Restore normal canvas sizing and redraw
  resizeToAspect();
  redraw();
}

// ---------- Utils ----------
function clampInt(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.floor(v)));
}

function isBlackHex(hex) {
  return (hex || '').toLowerCase() === '#000000';
}