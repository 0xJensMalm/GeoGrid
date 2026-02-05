// GeoGrid - High Resolution Export
// Handles exporting artwork with surrounding frame and signature

import { state, generateHash } from './state.js';
import { applySignatureColorForBg } from './controls.js';

let resizeCallback = null;
let redrawCallback = null;
let syncSignatureCallback = null;

export function initExport({ resize, redraw, syncSignature }) {
  resizeCallback = resize;
  redrawCallback = redraw;
  syncSignatureCallback = syncSignature;
}

export async function exportHighRes(resWidth, resHeight) {
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
  document.body.style.backgroundColor = state.bgColor;
  
  // Ensure signature color is correct before capture
  applySignatureColorForBg();
  
  // Export layout knobs (pixels)
  const padX = Math.round(resWidth * 0.06);
  const padTop = Math.round(resHeight * 0.06);
  const padBottom = Math.round(resHeight * 0.10);
  
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
  
  const availableW = resWidth - padX * 2;
  const availableH = resHeight - padTop - padBottom;
  
  canvasContainer.style.width = `${availableW}px`;
  canvasContainer.style.height = `${Math.max(100, Math.round(availableH * 0.78))}px`;
  canvasContainer.style.display = 'flex';
  canvasContainer.style.alignItems = 'center';
  canvasContainer.style.justifyContent = 'center';
  
  // Resize p5 canvas to fit inside canvasContainer while preserving aspect
  const targetAspect =
    state.aspectMode === 'landscape' ? 3 / 2 :
    state.aspectMode === 'portrait' ? 2 / 3 :
    1;
  
  let cw = availableW;
  let ch = Math.round(cw / targetAspect);
  
  const maxCanvasH = Math.max(100, Math.round(availableH * 0.78));
  if (ch > maxCanvasH) {
    ch = maxCanvasH;
    cw = Math.round(ch * targetAspect);
  }
  
  // Use p5's resizeCanvas
  window.resizeCanvas(cw, ch);
  redrawCallback?.();
  
  // After canvas is resized and signature text is updated, align + position signature
  syncSignatureCallback?.();
  applySignatureColorForBg();
  
  // Let layout settle
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  
  // Capture wrapper
  const captureCanvas = await html2canvas(wrapper, {
    backgroundColor: state.bgColor,
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
  ctx.fillStyle = state.bgColor;
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
  resizeCallback?.();
  redrawCallback?.();
}
