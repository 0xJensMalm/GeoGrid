// GeoGrid - UI Controls
// All control setup and event handlers

import { 
  state, 
  parseHash, 
  generateHash, 
  recalcGridDims, 
  syncHashToUrl,
  getBackgroundPalette,
  getSignaturePalette,
  getEffectiveSigColor,
  getThemeColors,
} from './state.js';

import { updateFavoriteButton } from './gallery.js';

let onGenerate = null;
let onRedraw = null;
let onResize = null;
let onExport = null;

export function initControls({ generate, redraw, resize, exportFn }) {
  onGenerate = generate;
  onRedraw = redraw;
  onResize = resize;
  onExport = exportFn;
  
  setupThemeSelect();
  setupGridSlider();
  setupAspectSelect();
  setupComplexitySlider();
  setupShowGridCheckbox();
  setupGenerateButton();
  setupSaveSection();
  setupHashControls();
  setupKeyboardShortcuts();
  setupToggleControls();
  
  refreshThemeUI();
}

function setupThemeSelect() {
  const themeSelect = document.getElementById('theme');
  if (!themeSelect) return;
  
  themeSelect.innerHTML = '';
  for (const t of window.THEME_LIST) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    themeSelect.appendChild(opt);
  }
  themeSelect.value = state.themeId;
  
  themeSelect.addEventListener('change', (e) => {
    state.themeId = e.target.value;
    
    // If current bgColor isn't in new palette, fall back to black
    const bgPalette = getBackgroundPalette();
    if (!bgPalette.some(c => c.toLowerCase() === state.bgColor.toLowerCase())) {
      state.bgColor = '#000000';
    }
    
    // If current sigColor isn't in new palette, reset to auto
    if (state.sigColor) {
      const sigPalette = getSignaturePalette();
      if (!sigPalette.some(c => c.toLowerCase() === state.sigColor.toLowerCase())) {
        state.sigColor = null;
      }
    }
    
    refreshThemeUI();
    syncHashToUrl();
    updateFavoriteButton();
    onRedraw?.();
  });
}

function setupGridSlider() {
  const gridSlider = document.getElementById('gridSize');
  const gridValue = document.getElementById('gridSizeValue');
  if (!gridSlider) return;
  
  gridSlider.value = state.gridSize;
  if (gridValue) gridValue.textContent = state.gridSize;
  
  gridSlider.addEventListener('input', (e) => {
    state.gridSize = parseInt(e.target.value);
    if (gridValue) gridValue.textContent = state.gridSize;
    recalcGridDims();
    onRedraw?.();
  });
}

function setupAspectSelect() {
  const aspectSelect = document.getElementById('aspect');
  if (!aspectSelect) return;
  
  aspectSelect.value = state.aspectMode;
  
  aspectSelect.addEventListener('change', (e) => {
    state.aspectMode = e.target.value;
    recalcGridDims();
    onResize?.();
    refreshThemeUI();
    syncHashToUrl();
    updateFavoriteButton();
    onRedraw?.();
  });
}

function setupComplexitySlider() {
  const complexitySlider = document.getElementById('complexity');
  const complexityValue = document.getElementById('complexityValue');
  if (!complexitySlider) return;
  
  complexitySlider.value = state.complexity;
  if (complexityValue) complexityValue.textContent = state.complexity;
  
  complexitySlider.addEventListener('input', (e) => {
    state.complexity = parseInt(e.target.value);
    if (complexityValue) complexityValue.textContent = state.complexity;
    onGenerate?.();
    syncHashToUrl();
    updateFavoriteButton();
    onRedraw?.();
  });
}

function setupShowGridCheckbox() {
  const gridCheckbox = document.getElementById('showGrid');
  if (!gridCheckbox) return;
  
  gridCheckbox.checked = state.showGrid;
  
  gridCheckbox.addEventListener('change', (e) => {
    state.showGrid = e.target.checked;
    onRedraw?.();
  });
}

function setupGenerateButton() {
  const generateBtn = document.getElementById('generate');
  if (!generateBtn) return;
  
  generateBtn.addEventListener('click', () => {
    state.seed = Math.floor(Math.random() * 999999999);
    onGenerate?.();
    syncHashToUrl();
    updateHashDisplay();
    updateFavoriteButton();
    onRedraw?.();
  });
}

function setupSaveSection() {
  const saveBtn = document.getElementById('save');
  const saveOptions = document.getElementById('save-options');
  const confirmSave = document.getElementById('confirmSave');
  const cancelSave = document.getElementById('cancelSave');
  const resWidthInput = document.getElementById('resWidth');
  const resHeightInput = document.getElementById('resHeight');
  
  if (!saveBtn) return;
  
  saveBtn.addEventListener('click', () => {
    saveBtn.classList.add('hidden');
    saveOptions?.classList.remove('hidden');
    resWidthInput?.focus();
    resWidthInput?.select();
  });
  
  cancelSave?.addEventListener('click', () => {
    saveOptions?.classList.add('hidden');
    saveBtn.classList.remove('hidden');
  });
  
  confirmSave?.addEventListener('click', () => {
    const resWidth = parseInt(resWidthInput?.value) || 2048;
    const resHeight = parseInt(resHeightInput?.value) || 2048;
    onExport?.(resWidth, resHeight);
    saveOptions?.classList.add('hidden');
    saveBtn.classList.remove('hidden');
  });
  
  const handleResKeypress = (e) => {
    if (e.key === 'Enter') confirmSave?.click();
  };
  resWidthInput?.addEventListener('keypress', handleResKeypress);
  resHeightInput?.addEventListener('keypress', handleResKeypress);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && saveOptions && !saveOptions.classList.contains('hidden')) {
      cancelSave?.click();
    }
  });
}

function setupHashControls() {
  const copyBtn = document.getElementById('copyHash');
  const loadBtn = document.getElementById('loadBtn');
  const loadInput = document.getElementById('loadHash');
  
  copyBtn?.addEventListener('click', () => {
    const hashEl = document.getElementById('seedHash');
    navigator.clipboard.writeText(hashEl?.textContent || '').then(() => {
      if (copyBtn) {
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓';
        setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 1500);
      }
    });
  });
  
  loadBtn?.addEventListener('click', () => {
    const hash = loadInput?.value.trim();
    if (hash && parseHash(hash)) {
      syncControlsToState();
      recalcGridDims();
      onResize?.();
      onGenerate?.();
      refreshThemeUI();
      syncHashToUrl();
      updateHashDisplay();
      updateFavoriteButton();
      onRedraw?.();
      if (loadInput) loadInput.value = '';
    } else if (loadInput) {
      loadInput.style.borderColor = '#ff4444';
      setTimeout(() => { loadInput.style.borderColor = ''; }, 1500);
    }
  });
  
  loadInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadBtn?.click();
  });
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore if focused on input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === 'n' || e.key === 'N') {
      document.getElementById('generate')?.click();
    }
    if (e.key === 's' || e.key === 'S') {
      document.getElementById('save')?.click();
    }
    if (e.key === 'c' || e.key === 'C') {
      const hashEl = document.getElementById('seedHash');
      navigator.clipboard.writeText(hashEl?.textContent || '');
    }
    if (e.key === 'f' || e.key === 'F') {
      document.getElementById('favoriteBtn')?.click();
    }
    if (e.key === 'g' || e.key === 'G') {
      document.getElementById('galleryBtn')?.click();
    }
    if (e.key === 'r' || e.key === 'R') {
      document.getElementById('cycleBtn')?.click();
    }
  });
}

function setupToggleControls() {
  const toggleBtn = document.getElementById('toggleControls');
  const controls = document.getElementById('controls');
  
  toggleBtn?.addEventListener('click', () => {
    controls?.classList.toggle('collapsed');
  });
}

// Sync UI controls to match current state
export function syncControlsToState() {
  const themeSelect = document.getElementById('theme');
  const complexitySlider = document.getElementById('complexity');
  const complexityValue = document.getElementById('complexityValue');
  const aspectSelect = document.getElementById('aspect');
  const gridSlider = document.getElementById('gridSize');
  const gridValue = document.getElementById('gridSizeValue');
  
  if (themeSelect) themeSelect.value = state.themeId;
  if (complexitySlider) complexitySlider.value = state.complexity;
  if (complexityValue) complexityValue.textContent = state.complexity;
  if (aspectSelect) aspectSelect.value = state.aspectMode;
  if (gridSlider) gridSlider.value = state.gridSize;
  if (gridValue) gridValue.textContent = state.gridSize;
}

export function updateHashDisplay() {
  const hashEl = document.getElementById('seedHash');
  if (hashEl) hashEl.textContent = generateHash();
}

export function refreshThemeUI() {
  refreshBgSwatches();
  refreshSigSwatches();
  updateSignature();
  applySignatureColor();
  document.body.style.backgroundColor = state.bgColor;
}

function refreshBgSwatches() {
  const palette = getBackgroundPalette();
  const wrap = document.getElementById('bgSwatches');
  if (!wrap) return;
  
  wrap.innerHTML = '';
  
  palette.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'bg-swatch' + (c.toLowerCase() === state.bgColor.toLowerCase() ? ' active' : '');
    div.style.backgroundColor = c;
    div.title = `Background: ${c}`;
    
    div.addEventListener('click', () => {
      state.bgColor = c;
      document.body.style.backgroundColor = state.bgColor;
      
      // Reset sig color to auto when bg changes (unless user has explicitly set it)
      if (!state.sigColor) {
        applySignatureColor();
      }
      
      syncHashToUrl();
      updateHashDisplay();
      updateFavoriteButton();
      refreshBgSwatches();
      refreshSigSwatches();
      onRedraw?.();
    });
    
    wrap.appendChild(div);
  });
}

function refreshSigSwatches() {
  const palette = getSignaturePalette();
  const wrap = document.getElementById('sigSwatches');
  if (!wrap) return;
  
  wrap.innerHTML = '';
  
  // Add "Auto" option first
  const autoDiv = document.createElement('div');
  autoDiv.className = 'sig-swatch auto-swatch' + (!state.sigColor ? ' active' : '');
  autoDiv.title = 'Auto (adapts to background)';
  autoDiv.textContent = 'A';
  
  autoDiv.addEventListener('click', () => {
    state.sigColor = null;
    applySignatureColor();
    syncHashToUrl();
    updateHashDisplay();
    updateFavoriteButton();
    refreshSigSwatches();
  });
  
  wrap.appendChild(autoDiv);
  
  // Add color swatches
  palette.forEach((c) => {
    const div = document.createElement('div');
    const isActive = state.sigColor && c.toLowerCase() === state.sigColor.toLowerCase();
    div.className = 'sig-swatch' + (isActive ? ' active' : '');
    div.style.backgroundColor = c;
    div.title = `Font: ${c}`;
    
    div.addEventListener('click', () => {
      state.sigColor = c;
      applySignatureColor();
      syncHashToUrl();
      updateHashDisplay();
      updateFavoriteButton();
      refreshSigSwatches();
    });
    
    wrap.appendChild(div);
  });
}

export function updateSignature() {
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

export function applySignatureColor() {
  const signature = document.getElementById('signature');
  if (!signature) return;
  
  const effectiveColor = getEffectiveSigColor();
  
  signature.style.setProperty('--sig-color', effectiveColor);
  signature.style.color = effectiveColor;
}

// Keep old name for backward compatibility with export.js
export function applySignatureColorForBg() {
  applySignatureColor();
}
