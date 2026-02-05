// GeoGrid - State Management
// Central state, URL sync, localStorage persistence

const STORAGE_KEY = 'geogrid_favorites';
const DEFAULT_FAVORITES_URL = 'favorites.json';

// Central application state
export const state = {
  seed: null,
  themeId: 'olives',
  complexity: 2,
  aspectMode: 'square',
  bgColor: '#000000',
  sigColor: null, // null = auto (light on black, black on others)
  gridSize: 10,
  showGrid: true,
  
  // Derived values (computed from above)
  gridCols: 10,
  gridRows: 10,
  
  // Pattern data
  pattern: null,
  
  // Canvas reference
  canvasEl: null,
};

// Initialize state with random seed
export function initState() {
  state.seed = Math.floor(Math.random() * 999999999);
}

// Recalculate grid dimensions based on aspect mode
export function recalcGridDims() {
  if (state.aspectMode === 'landscape') {
    state.gridRows = state.gridSize;
    state.gridCols = Math.round(state.gridSize * 1.5);
  } else if (state.aspectMode === 'portrait') {
    state.gridCols = state.gridSize;
    state.gridRows = Math.round(state.gridSize * 1.5);
  } else {
    state.gridCols = state.gridSize;
    state.gridRows = state.gridSize;
  }
  
  state.gridCols = Math.max(2, state.gridCols);
  state.gridRows = Math.max(2, state.gridRows);
}

// --- Hash Generation & Parsing ---

export function generateHash() {
  const themeIndex = getThemeIndexById(state.themeId);
  const aspectIndex = state.aspectMode === 'square' ? 0 : state.aspectMode === 'landscape' ? 1 : 2;
  const bgPalette = getBackgroundPalette();
  let bgIdx = bgPalette.findIndex(c => c.toLowerCase() === state.bgColor.toLowerCase());
  if (bgIdx < 0) bgIdx = 0;
  
  // sigColorIdx: -1 (auto) encoded as 'a', otherwise index
  const sigIdx = getSigColorIndex();
  const sigPart = sigIdx < 0 ? 'a' : sigIdx.toString(36);
  
  return `${state.seed.toString(36)}-${themeIndex.toString(36)}-${state.complexity.toString(36)}-${aspectIndex.toString(36)}-${bgIdx.toString(36)}-${sigPart}`;
}

export function parseHash(hash) {
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
    
    state.seed = newSeed;
    setThemeByIndex(themeIndex);
    state.complexity = newComplexity;
    state.aspectMode = aspectIndex === 1 ? 'landscape' : aspectIndex === 2 ? 'portrait' : 'square';
    
    const bgPalette = getBackgroundPalette();
    const safeBgIndex = clampInt(isNaN(newBgIndex) ? 0 : newBgIndex, 0, bgPalette.length - 1);
    state.bgColor = bgPalette[safeBgIndex];
    
    // Parse signature color (6th part, optional)
    if (parts.length >= 6) {
      const sigPart = parts[5];
      if (sigPart === 'a') {
        state.sigColor = null; // auto
      } else {
        const sigIdx = parseInt(sigPart, 36);
        setSigColorFromIndex(isNaN(sigIdx) ? -1 : sigIdx);
      }
    } else {
      state.sigColor = null; // auto for old hashes
    }
    
    return true;
  } catch (e) {
    console.error('Invalid hash:', e);
    return false;
  }
}

// --- URL Sync ---

export function syncHashToUrl() {
  const hash = generateHash();
  const url = new URL(window.location);
  url.searchParams.set('h', hash);
  window.history.replaceState({}, '', url);
}

export function loadHashFromUrl() {
  const url = new URL(window.location);
  const hash = url.searchParams.get('h');
  if (hash) {
    return parseHash(hash);
  }
  return false;
}

// --- Theme Helpers ---

export function getThemeColors() {
  const t = window.THEMES_BY_ID?.[state.themeId] ?? window.THEME_LIST?.[0];
  return t?.colors ?? ['#111', '#333', '#666', '#999', '#eee'];
}

export function getThemeIndexById(id) {
  const idx = window.THEME_LIST.findIndex(t => t.id === id);
  return idx >= 0 ? idx : 0;
}

export function setThemeByIndex(idx) {
  const t = window.THEME_LIST[clampInt(idx, 0, window.THEME_LIST.length - 1)];
  state.themeId = t.id;
}

export function getBackgroundPalette() {
  return ['#000000', ...getThemeColors()];
}

export function getSignaturePalette() {
  // Same as background: black + theme colors
  return ['#000000', ...getThemeColors()];
}

// Get effective signature color (handles auto default)
export function getEffectiveSigColor() {
  if (state.sigColor) {
    return state.sigColor;
  }
  // Auto: light grey on black bg, black on other backgrounds
  const isBlackBg = (state.bgColor || '').toLowerCase() === '#000000';
  return isBlackBg ? '#888888' : '#000000';
}

// Get signature color index for hash (-1 = auto)
export function getSigColorIndex() {
  if (!state.sigColor) return -1; // auto
  const palette = getSignaturePalette();
  const idx = palette.findIndex(c => c.toLowerCase() === state.sigColor.toLowerCase());
  return idx >= 0 ? idx : -1;
}

// Set signature color from index (-1 = auto)
export function setSigColorFromIndex(idx) {
  if (idx < 0) {
    state.sigColor = null; // auto
  } else {
    const palette = getSignaturePalette();
    state.sigColor = palette[clampInt(idx, 0, palette.length - 1)];
  }
}

// --- Favorites / LocalStorage ---

let favoritesCache = null;

export async function loadFavorites() {
  // First check localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      favoritesCache = JSON.parse(stored);
      return favoritesCache;
    } catch (e) {
      console.error('Failed to parse stored favorites:', e);
    }
  }
  
  // Fall back to loading from JSON file (initial seeds)
  try {
    const response = await fetch(DEFAULT_FAVORITES_URL);
    if (response.ok) {
      favoritesCache = await response.json();
      saveFavoritesToStorage();
      return favoritesCache;
    }
  } catch (e) {
    console.error('Failed to load default favorites:', e);
  }
  
  favoritesCache = [];
  return favoritesCache;
}

export function getFavorites() {
  return favoritesCache || [];
}

export function saveFavoritesToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritesCache || []));
}

export function addFavorite(name = '') {
  const hash = generateHash();
  const existing = favoritesCache.find(f => f.hash === hash);
  if (existing) return false;
  
  favoritesCache.push({
    hash,
    name: name || `Untitled ${favoritesCache.length + 1}`,
    date: new Date().toISOString().split('T')[0],
  });
  
  saveFavoritesToStorage();
  return true;
}

export function removeFavorite(hash) {
  const idx = favoritesCache.findIndex(f => f.hash === hash);
  if (idx >= 0) {
    favoritesCache.splice(idx, 1);
    saveFavoritesToStorage();
    return true;
  }
  return false;
}

export function renameFavorite(hash, newName) {
  const fav = favoritesCache.find(f => f.hash === hash);
  if (fav) {
    fav.name = newName;
    saveFavoritesToStorage();
    return true;
  }
  return false;
}

export function isFavorite(hash) {
  if (!hash) hash = generateHash();
  return favoritesCache?.some(f => f.hash === hash) || false;
}

export function getRandomFavorite() {
  if (!favoritesCache || favoritesCache.length === 0) return null;
  const idx = Math.floor(Math.random() * favoritesCache.length);
  return favoritesCache[idx];
}

// --- Utility ---

export function clampInt(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.floor(v)));
}
