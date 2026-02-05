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
  
  // Optional grid overlay
  if (state.showGrid && Math.max(state.gridCols, state.gridRows) <= 40) {
    stroke(255, 15);
    strokeWeight(0.5);
    noFill();
    
    for (let r = 0; r <= state.gridRows; r++) {
      const y = offsetY + r * cellSize;
      line(offsetX, y, offsetX + gridW, y);
    }
    for (let c = 0; c <= state.gridCols; c++) {
      const x = offsetX + c * cellSize;
      line(x, offsetY, x, offsetY + gridH);
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
  
  const gridRes = state.complexity + 1;
  
  state.pattern = {
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
        state.pattern.triangles.push({ vertices: [tl, tr, br], colorIndex: colorIdx1 });
        state.pattern.triangles.push({ vertices: [tl, br, bl], colorIndex: colorIdx2 });
      } else {
        state.pattern.triangles.push({ vertices: [tl, tr, bl], colorIndex: colorIdx1 });
        state.pattern.triangles.push({ vertices: [tr, br, bl], colorIndex: colorIdx2 });
      }
    }
  }
  
  updateHashDisplay();
}

function drawCell(size, colors) {
  noStroke();
  for (const tri of state.pattern.triangles) {
    fill(colors[tri.colorIndex % colors.length]);
    beginShape();
    for (const v of tri.vertices) vertex(v.x * size, v.y * size);
    endShape(CLOSE);
  }
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
