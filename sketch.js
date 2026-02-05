// GeoGrid - Core Drawing Module
// p5.js setup, draw, and pattern generation

import { 
  state, 
  initState, 
  recalcGridDims, 
  loadHashFromUrl, 
  syncHashToUrl,
  loadFavorites,
  getThemeColors,
} from './state.js';

import { 
  initControls, 
  syncControlsToState, 
  refreshThemeUI, 
  updateHashDisplay,
  updateSignature,
  applySignatureColorForBg,
} from './controls.js';

import { initGallery, updateFavoriteButton } from './gallery.js';
import { initExport, exportHighRes } from './export.js';
import { generatePatternForMode, drawCellForMode } from './modes.js';

// p5.js instance mode would be cleaner, but keeping global mode for compatibility
window.setup = async function() {
  // Initialize state
  initState();
  
  // Load favorites from localStorage/JSON
  await loadFavorites();
  
  // Check URL for hash parameter
  if (loadHashFromUrl()) {
    recalcGridDims();
  }
  
  // Create canvas
  const { w, h } = getCanvasSizeForAspect();
  const canvas = createCanvas(w, h);
  canvas.parent('canvas-container');
  state.canvasEl = canvas.elt;
  
  noLoop();
  
  // Generate initial pattern
  generatePattern();
  
  // Initialize controls with callbacks
  initControls({
    generate: generatePattern,
    redraw: () => redraw(),
    resize: resizeToAspect,
    exportFn: exportHighRes,
  });
  
  // Initialize export module
  initExport({
    resize: resizeToAspect,
    redraw: () => redraw(),
    syncSignature: syncSignatureLayout,
  });
  
  // Initialize gallery
  initGallery(handleStateChange);
  
  // Sync UI to state
  syncControlsToState();
  recalcGridDims();
  refreshThemeUI();
  updateHashDisplay();
  syncHashToUrl();
  updateFavoriteButton();
};

window.draw = function() {
  const colors = getThemeColors();
  
  // Canvas background
  background(state.bgColor);
  
  // Frame background (outside canvas)
  document.body.style.backgroundColor = state.bgColor;
  
  // Signature color
  applySignatureColorForBg();
  
  // Compute square cell size that fits BOTH axes
  const cellSize = Math.min(width / state.gridCols, height / state.gridRows);
  
  // Center the grid so empty margins are symmetric
  const gridW = cellSize * state.gridCols;
  const gridH = cellSize * state.gridRows;
  const offsetX = (width - gridW) / 2;
  const offsetY = (height - gridH) / 2;
  
  // Draw cells
  for (let row = 0; row < state.gridRows; row++) {
    for (let col = 0; col < state.gridCols; col++) {
      push();
      translate(offsetX + col * cellSize, offsetY + row * cellSize);
      drawCell(cellSize, colors);
      pop();
    }
  }
  
  updateSignature();
  syncSignatureLayout();
};

// Handle state changes from gallery
function handleStateChange() {
  syncControlsToState();
  generatePattern();
  refreshThemeUI();
  updateHashDisplay();
  updateFavoriteButton();
  redraw();
}

// Pattern generation
function generatePattern() {
  randomSeed(state.seed);
  
  // Generate pattern using the mode-specific function
  state.pattern = generatePatternForMode(
    state.mode,
    state.complexity,
    () => randomSeed(state.seed), // seedFn (not used, already seeded above)
    () => random(),               // randomFn
    (n) => floor(n)               // floorFn
  );
  
  updateHashDisplay();
}

function drawCell(size, colors) {
  // Create a p5 instance-like object with the global functions
  const p5 = {
    noStroke,
    fill,
    beginShape,
    endShape,
    vertex,
    rect,
    arc,
    CLOSE,
    PIE,
    HALF_PI,
    PI,
    TWO_PI,
  };
  
  drawCellForMode(state.pattern, size, colors, p5);
}

// Canvas sizing
function getCanvasSizeForAspect() {
  const baseH = Math.floor(windowHeight * 0.70);
  
  if (state.aspectMode === 'landscape') {
    return { w: Math.floor(baseH * 1.5), h: baseH };
  }
  if (state.aspectMode === 'portrait') {
    return { w: Math.floor(baseH * (2 / 3)), h: baseH };
  }
  return { w: baseH, h: baseH };
}

function resizeToAspect() {
  const { w, h } = getCanvasSizeForAspect();
  resizeCanvas(w, h);
}

window.windowResized = function() {
  resizeToAspect();
  redraw();
};

// Signature layout
function syncSignatureLayout() {
  const wrapper = document.getElementById('artwork-wrapper');
  const signature = document.getElementById('signature');
  if (!wrapper || !signature || !state.canvasEl) return;
  
  const wRect = wrapper.getBoundingClientRect();
  const cRect = state.canvasEl.getBoundingClientRect();
  
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
