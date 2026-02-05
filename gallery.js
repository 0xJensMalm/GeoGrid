// GeoGrid - Gallery & Favorites UI
// Gallery modal, favorites management, cycling

import { 
  state, 
  getFavorites, 
  addFavorite, 
  removeFavorite, 
  renameFavorite,
  isFavorite, 
  getRandomFavorite,
  parseHash,
  generateHash,
  recalcGridDims,
  syncHashToUrl,
} from './state.js';

let galleryModal = null;
let onStateChange = null;

export function initGallery(stateChangeCallback) {
  onStateChange = stateChangeCallback;
  createGalleryModal();
  setupGalleryButtons();
  updateFavoriteButton();
}

function createGalleryModal() {
  galleryModal = document.createElement('div');
  galleryModal.id = 'gallery-modal';
  galleryModal.className = 'modal hidden';
  galleryModal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Favorites</h2>
        <button class="modal-close" title="Close">×</button>
      </div>
      <div class="modal-body">
        <div id="favorites-list"></div>
        <div id="favorites-empty" class="hidden">
          <p>No favorites yet.</p>
          <p>Click the star button to save the current artwork.</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(galleryModal);
  
  // Close handlers
  galleryModal.querySelector('.modal-backdrop').addEventListener('click', closeGallery);
  galleryModal.querySelector('.modal-close').addEventListener('click', closeGallery);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !galleryModal.classList.contains('hidden')) {
      closeGallery();
    }
  });
}

function setupGalleryButtons() {
  const favoriteBtn = document.getElementById('favoriteBtn');
  const galleryBtn = document.getElementById('galleryBtn');
  const cycleBtn = document.getElementById('cycleBtn');
  
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', toggleFavorite);
  }
  
  if (galleryBtn) {
    galleryBtn.addEventListener('click', openGallery);
  }
  
  if (cycleBtn) {
    cycleBtn.addEventListener('click', cycleRandomFavorite);
  }
}

export function updateFavoriteButton() {
  const favoriteBtn = document.getElementById('favoriteBtn');
  if (!favoriteBtn) return;
  
  const isFav = isFavorite();
  favoriteBtn.classList.toggle('active', isFav);
  favoriteBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
}

function toggleFavorite() {
  const hash = generateHash();
  
  if (isFavorite(hash)) {
    removeFavorite(hash);
  } else {
    addFavorite();
  }
  
  updateFavoriteButton();
}

export function openGallery() {
  renderFavoritesList();
  galleryModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

export function closeGallery() {
  galleryModal.classList.add('hidden');
  document.body.style.overflow = '';
}

function renderFavoritesList() {
  const list = document.getElementById('favorites-list');
  const empty = document.getElementById('favorites-empty');
  const favorites = getFavorites();
  
  if (favorites.length === 0) {
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  
  list.classList.remove('hidden');
  empty.classList.add('hidden');
  
  const currentHash = generateHash();
  
  list.innerHTML = favorites.map(fav => `
    <div class="favorite-item ${fav.hash === currentHash ? 'active' : ''}" data-hash="${fav.hash}">
      <div class="favorite-preview" data-hash="${fav.hash}">
        <canvas class="preview-canvas" width="60" height="60"></canvas>
      </div>
      <div class="favorite-info">
        <input type="text" class="favorite-name" value="${escapeHtml(fav.name)}" data-hash="${fav.hash}">
        <span class="favorite-date">${fav.date}</span>
        <span class="favorite-hash">${fav.hash}</span>
      </div>
      <div class="favorite-actions">
        <button class="favorite-load" data-hash="${fav.hash}" title="Load">→</button>
        <button class="favorite-delete" data-hash="${fav.hash}" title="Delete">×</button>
      </div>
    </div>
  `).join('');
  
  // Render previews
  setTimeout(() => renderPreviews(), 10);
  
  // Event handlers
  list.querySelectorAll('.favorite-load').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const hash = e.target.dataset.hash;
      loadFavorite(hash);
    });
  });
  
  list.querySelectorAll('.favorite-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const hash = e.target.dataset.hash;
      removeFavorite(hash);
      renderFavoritesList();
      updateFavoriteButton();
    });
  });
  
  list.querySelectorAll('.favorite-name').forEach(input => {
    input.addEventListener('change', (e) => {
      const hash = e.target.dataset.hash;
      renameFavorite(hash, e.target.value);
    });
  });
  
  list.querySelectorAll('.favorite-preview').forEach(preview => {
    preview.addEventListener('click', (e) => {
      const hash = preview.dataset.hash;
      loadFavorite(hash);
    });
  });
}

function renderPreviews() {
  const favorites = getFavorites();
  
  favorites.forEach(fav => {
    const canvas = document.querySelector(`.favorite-item[data-hash="${fav.hash}"] .preview-canvas`);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const size = 60;
    
    // Parse the hash to get theme and bg
    const parts = fav.hash.split('-');
    const seed = parseInt(parts[0], 36);
    const themeIndex = parseInt(parts[1], 36);
    const complexity = parseInt(parts[2], 36);
    const bgIndex = parts.length >= 5 ? parseInt(parts[4], 36) : 0;
    
    const theme = window.THEME_LIST[themeIndex] || window.THEME_LIST[0];
    const colors = theme.colors;
    const bgPalette = ['#000000', ...colors];
    const bgColor = bgPalette[bgIndex] || '#000000';
    
    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    
    // Generate mini pattern
    const gridRes = complexity + 1;
    const rng = seededRandom(seed);
    
    const cellSize = size / 3;
    
    for (let cy = 0; cy < 3; cy++) {
      for (let cx = 0; cx < 3; cx++) {
        const ox = cx * cellSize;
        const oy = cy * cellSize;
        
        for (let row = 0; row < gridRes - 1; row++) {
          for (let col = 0; col < gridRes - 1; col++) {
            const x0 = col / (gridRes - 1) * cellSize;
            const y0 = row / (gridRes - 1) * cellSize;
            const x1 = (col + 1) / (gridRes - 1) * cellSize;
            const y1 = (row + 1) / (gridRes - 1) * cellSize;
            
            const diagDirection = rng() > 0.5;
            const colorIdx1 = Math.floor(rng() * 8);
            const colorIdx2 = Math.floor(rng() * 8);
            
            ctx.fillStyle = colors[colorIdx1 % colors.length];
            ctx.beginPath();
            if (diagDirection) {
              ctx.moveTo(ox + x0, oy + y0);
              ctx.lineTo(ox + x1, oy + y0);
              ctx.lineTo(ox + x1, oy + y1);
            } else {
              ctx.moveTo(ox + x0, oy + y0);
              ctx.lineTo(ox + x1, oy + y0);
              ctx.lineTo(ox + x0, oy + y1);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = colors[colorIdx2 % colors.length];
            ctx.beginPath();
            if (diagDirection) {
              ctx.moveTo(ox + x0, oy + y0);
              ctx.lineTo(ox + x1, oy + y1);
              ctx.lineTo(ox + x0, oy + y1);
            } else {
              ctx.moveTo(ox + x1, oy + y0);
              ctx.lineTo(ox + x1, oy + y1);
              ctx.lineTo(ox + x0, oy + y1);
            }
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
  });
}

function loadFavorite(hash) {
  if (parseHash(hash)) {
    recalcGridDims();
    syncHashToUrl();
    closeGallery();
    if (onStateChange) onStateChange();
  }
}

function cycleRandomFavorite() {
  const fav = getRandomFavorite();
  if (fav) {
    loadFavorite(fav.hash);
  }
}

// p5.js-compatible seeded random (Linear Congruential Generator)
// Uses the same constants as p5.js to produce identical sequences
function seededRandom(seed) {
  const m = 4294967296; // 2^32
  const a = 1664525;
  const c = 1013904223;
  let s = seed >>> 0; // Ensure unsigned 32-bit
  
  return function() {
    s = (a * s + c) >>> 0; // Keep as unsigned 32-bit
    return s / m;
  };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
