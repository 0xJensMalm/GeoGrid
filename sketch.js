// GeoGrid - Vertex-based geometric pattern generator
// Uses internal grid resolution for pattern complexity
// Each cell is a clone of the master pattern

let gridSize = 10;
let pattern = null;
let bgColor = '#0a0a0f';
let currentTheme = 'olive';
let complexity = 2;
let showGrid = true;
let seed;

// Color themes - 5 colors each
const themes = {
  olive: ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25'],
  fieryOcean: ['#780000', '#c1121f', '#fdf0d5', '#003049', '#669bbc'],
  freshSummer: ['#8ecae6', '#219ebc', '#023047', '#ffb703', '#fb8500'],
  pastelSweets: ['#f6bd60', '#f7ede2', '#f5cac3', '#84a59d', '#f28482'],
  autumnGlow: ['#003049', '#d62828', '#f77f00', '#fcbf49', '#eae2b7'],
  freshSummer: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
  colorFeeling: ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff']
};

function setup() {
  seed = Math.floor(Math.random() * 999999999);
  
  // Canvas takes up 70% of viewport height, square aspect ratio
  const canvasSize = Math.floor(windowHeight * 0.70);
  const canvas = createCanvas(canvasSize, canvasSize);
  canvas.parent('canvas-container');
  
  noLoop();
  generatePattern();
  
  setupControls();
}

function draw() {
  background(bgColor);
  
  // Calculate cell size - canvas is already sized, fill it completely
  const cellSize = width / gridSize;
  
  // Draw all cells with the same pattern
  const colors = themes[currentTheme];
  
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      push();
      translate(col * cellSize, row * cellSize);
      drawCell(cellSize, colors);
      pop();
    }
  }
  
  // Optional grid overlay
  if (showGrid && gridSize <= 40) {
    stroke(255, 15);
    strokeWeight(0.5);
    noFill();
    for (let row = 0; row <= gridSize; row++) {
      line(0, row * cellSize, width, row * cellSize);
    }
    for (let col = 0; col <= gridSize; col++) {
      line(col * cellSize, 0, col * cellSize, height);
    }
  }
  
  // Update signature
  updateSignature();
}

// Generate hash from current state
function generateHash() {
  const themeIndex = Object.keys(themes).indexOf(currentTheme);
  return `${seed.toString(36)}-${themeIndex.toString(36)}-${complexity.toString(36)}`;
}

// Parse hash and restore state
function parseHash(hash) {
  try {
    const parts = hash.split('-');
    if (parts.length >= 3) {
      const newSeed = parseInt(parts[0], 36);
      const themeIndex = parseInt(parts[1], 36);
      const newComplexity = parseInt(parts[2], 36);
      
      const themeKeys = Object.keys(themes);
      if (!isNaN(newSeed) && themeIndex >= 0 && themeIndex < themeKeys.length && newComplexity >= 1 && newComplexity <= 5) {
        seed = newSeed;
        currentTheme = themeKeys[themeIndex];
        complexity = newComplexity;
        return true;
      }
    }
  } catch (e) {
    console.error('Invalid hash:', e);
  }
  return false;
}

// Update hash display
function updateHashDisplay() {
  const hashInput = document.getElementById('seedHash');
  if (hashInput) {
    hashInput.value = generateHash();
  }
}

// Update signature display
function updateSignature() {
  const sigHash = document.getElementById('sigHash');
  const sigColors = document.getElementById('sigColors');
  
  if (sigHash) {
    sigHash.textContent = generateHash();
  }
  
  if (sigColors) {
    const colors = themes[currentTheme];
    sigColors.innerHTML = '';
    for (const color of colors) {
      const swatch = document.createElement('div');
      swatch.className = 'sig-color-swatch';
      swatch.style.backgroundColor = color;
      sigColors.appendChild(swatch);
    }
  }
}

// Generate pattern using internal grid approach
// Complexity 1 = 2x2 grid (2 triangles)
// Complexity 2 = 3x3 grid (8 triangles)
// Complexity 3 = 4x4 grid (18 triangles)
// Complexity 4 = 5x5 grid (32 triangles)
// Complexity 5 = 6x6 grid (50 triangles)
function generatePattern() {
  randomSeed(seed);
  
  // Grid resolution: complexity 1 = 2x2 points, complexity 5 = 6x6 points
  const gridRes = complexity + 1;
  
  pattern = {
    gridRes: gridRes,
    triangles: []
  };
  
  // For each cell in the internal grid, create 2 triangles
  for (let row = 0; row < gridRes - 1; row++) {
    for (let col = 0; col < gridRes - 1; col++) {
      // Calculate normalized coordinates (0-1)
      const x0 = col / (gridRes - 1);
      const y0 = row / (gridRes - 1);
      const x1 = (col + 1) / (gridRes - 1);
      const y1 = (row + 1) / (gridRes - 1);
      
      // Four corners of this sub-cell
      const tl = { x: x0, y: y0 };
      const tr = { x: x1, y: y0 };
      const bl = { x: x0, y: y1 };
      const br = { x: x1, y: y1 };
      
      // Randomly choose diagonal direction for visual variety
      const diagDirection = random() > 0.5;
      
      // Randomly assign color indices (stored separately from actual colors)
      const colorIdx1 = floor(random(8));
      const colorIdx2 = floor(random(8));
      
      if (diagDirection) {
        // Diagonal: top-left to bottom-right
        pattern.triangles.push({
          vertices: [tl, tr, br],
          colorIndex: colorIdx1
        });
        pattern.triangles.push({
          vertices: [tl, br, bl],
          colorIndex: colorIdx2
        });
      } else {
        // Diagonal: top-right to bottom-left
        pattern.triangles.push({
          vertices: [tl, tr, bl],
          colorIndex: colorIdx1
        });
        pattern.triangles.push({
          vertices: [tr, br, bl],
          colorIndex: colorIdx2
        });
      }
    }
  }
  
  updateHashDisplay();
}

// Draw a single cell with the pattern
function drawCell(size, colors) {
  noStroke();
  
  for (const tri of pattern.triangles) {
    // Get color from current theme using stored index
    fill(colors[tri.colorIndex % colors.length]);
    
    beginShape();
    for (const v of tri.vertices) {
      vertex(v.x * size, v.y * size);
    }
    endShape(CLOSE);
  }
}

// Setup control panel interactions
function setupControls() {
  // Grid size
  const gridSlider = document.getElementById('gridSize');
  const gridValue = document.getElementById('gridSizeValue');
  gridSlider.addEventListener('input', (e) => {
    gridSize = parseInt(e.target.value);
    gridValue.textContent = gridSize;
    redraw();
  });
  
  // Theme - only updates colors, does NOT regenerate pattern
  const themeSelect = document.getElementById('theme');
  themeSelect.addEventListener('change', (e) => {
    currentTheme = e.target.value;
    updateHashDisplay();
    redraw();
  });
  
  // Background color
  const bgInput = document.getElementById('bgColor');
  bgInput.addEventListener('input', (e) => {
    bgColor = e.target.value;
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
    redraw();
  });
  
  // Save
  const saveBtn = document.getElementById('save');
  saveBtn.addEventListener('click', () => {
    saveCanvas(`geogrid-${generateHash()}`, 'png');
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
      // Update UI to match loaded state
      document.getElementById('theme').value = currentTheme;
      document.getElementById('complexity').value = complexity;
      document.getElementById('complexityValue').textContent = complexity;
      generatePattern();
      redraw();
      loadInput.value = '';
    } else {
      loadInput.style.borderColor = '#ff4444';
      setTimeout(() => { loadInput.style.borderColor = ''; }, 1500);
    }
  });
  
  // Also allow Enter key in load input
  loadInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadBtn.click();
    }
  });
}

// Handle window resize
function windowResized() {
  const canvasSize = Math.floor(windowHeight * 0.70);
  resizeCanvas(canvasSize, canvasSize);
  redraw();
}

// Keyboard shortcuts
function keyPressed() {
  if (key === 'n' || key === 'N') {
    seed = Math.floor(Math.random() * 999999999);
    generatePattern();
    redraw();
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`geogrid-${generateHash()}`, 'png');
  }
  if (key === 'c' || key === 'C') {
    const hashInput = document.getElementById('seedHash');
    navigator.clipboard.writeText(hashInput.value);
  }
}
