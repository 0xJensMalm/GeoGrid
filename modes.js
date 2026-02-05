// GeoGrid - Drawing Modes
// Pattern generation and rendering for different geometric modes

export const MODES = {
  triangle: {
    id: 'triangle',
    name: 'Triangle',
    icon: 'triangle',
  },
  circle: {
    id: 'circle', 
    name: 'Circle',
    icon: 'circle',
  },
};

export const MODE_LIST = Object.values(MODES);
export const DEFAULT_MODE = 'triangle';

// Generate pattern data based on mode
export function generatePatternForMode(mode, complexity, seedFn, randomFn, floorFn) {
  const gridRes = complexity + 1;
  
  if (mode === 'circle') {
    return generateCirclePattern(gridRes, randomFn, floorFn);
  }
  
  // Default: triangle mode
  return generateTrianglePattern(gridRes, randomFn, floorFn);
}

// Triangle pattern generation (original)
function generateTrianglePattern(gridRes, randomFn, floorFn) {
  const triangles = [];
  
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
      
      const diagDirection = randomFn() > 0.5;
      const colorIdx1 = floorFn(randomFn() * 8);
      const colorIdx2 = floorFn(randomFn() * 8);
      
      if (diagDirection) {
        triangles.push({ vertices: [tl, tr, br], colorIndex: colorIdx1 });
        triangles.push({ vertices: [tl, br, bl], colorIndex: colorIdx2 });
      } else {
        triangles.push({ vertices: [tl, tr, bl], colorIndex: colorIdx1 });
        triangles.push({ vertices: [tr, br, bl], colorIndex: colorIdx2 });
      }
    }
  }
  
  return { gridRes, triangles, mode: 'triangle' };
}

// Circle/arc pattern generation
function generateCirclePattern(gridRes, randomFn, floorFn) {
  const cells = [];
  
  for (let row = 0; row < gridRes - 1; row++) {
    for (let col = 0; col < gridRes - 1; col++) {
      const x = col / (gridRes - 1);
      const y = row / (gridRes - 1);
      const w = 1 / (gridRes - 1);
      const h = 1 / (gridRes - 1);
      
      // Pick a random corner for the arc origin (0-3)
      const corner = floorFn(randomFn() * 4);
      const bgColorIdx = floorFn(randomFn() * 8);
      const arcColorIdx = floorFn(randomFn() * 8);
      
      cells.push({
        x, y, w, h,
        corner,
        bgColorIndex: bgColorIdx,
        arcColorIndex: arcColorIdx,
      });
    }
  }
  
  return { gridRes, cells, mode: 'circle' };
}

// Draw a single cell based on mode
export function drawCellForMode(pattern, size, colors, p5) {
  if (pattern.mode === 'circle') {
    drawCircleCell(pattern, size, colors, p5);
  } else {
    drawTriangleCell(pattern, size, colors, p5);
  }
}

// Draw triangle cell
function drawTriangleCell(pattern, size, colors, p5) {
  p5.noStroke();
  for (const tri of pattern.triangles) {
    p5.fill(colors[tri.colorIndex % colors.length]);
    p5.beginShape();
    for (const v of tri.vertices) {
      p5.vertex(v.x * size, v.y * size);
    }
    p5.endShape(p5.CLOSE);
  }
}

// Draw circle/arc cell
function drawCircleCell(pattern, size, colors, p5) {
  p5.noStroke();
  
  for (const cell of pattern.cells) {
    const x = cell.x * size;
    const y = cell.y * size;
    const w = cell.w * size;
    const h = cell.h * size;
    
    // Draw background rectangle
    p5.fill(colors[cell.bgColorIndex % colors.length]);
    p5.rect(x, y, w, h);
    
    // Calculate arc center and angles based on corner
    let cx, cy, startAngle, endAngle;
    
    switch (cell.corner) {
      case 0: // Top-left corner - arc goes down-right
        cx = x;
        cy = y;
        startAngle = 0;
        endAngle = p5.HALF_PI;
        break;
      case 1: // Top-right corner - arc goes down-left
        cx = x + w;
        cy = y;
        startAngle = p5.HALF_PI;
        endAngle = p5.PI;
        break;
      case 2: // Bottom-right corner - arc goes up-left
        cx = x + w;
        cy = y + h;
        startAngle = p5.PI;
        endAngle = p5.PI + p5.HALF_PI;
        break;
      case 3: // Bottom-left corner - arc goes up-right
        cx = x;
        cy = y + h;
        startAngle = p5.PI + p5.HALF_PI;
        endAngle = p5.TWO_PI;
        break;
    }
    
    // Draw quarter circle arc (pie slice)
    p5.fill(colors[cell.arcColorIndex % colors.length]);
    p5.arc(cx, cy, w * 2, h * 2, startAngle, endAngle, p5.PIE);
  }
}
