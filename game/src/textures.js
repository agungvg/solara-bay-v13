// Procedural canvas textures for Solara Bay v13.
// SMOOTHNESS IS THE POINT: every surface is drawn at 1024x1024 (512 for small
// ones) with smooth linear gradients, low-alpha speckle noise and soft-edged
// details — no flat colours, no hard banding, no pixelated tiles.
import * as THREE from 'three';
import { mulberry32 } from './random.js';

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  return [c, c.getContext('2d')];
}

function softSpeckle(ctx, size, rng, count, alpha, light = true) {
  for (let i = 0; i < count; i++) {
    const x = rng() * size, y = rng() * size, r = 0.6 + rng() * 2.2;
    ctx.fillStyle = light
      ? `rgba(255,255,255,${alpha * rng()})`
      : `rgba(0,0,0,${alpha * rng()})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
}

// Smooth vertical gradient over the whole tile, plus a faint horizontal sheen.
function baseGradient(ctx, size, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, size);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const sheen = ctx.createLinearGradient(0, 0, size, size);
  sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = sheen; ctx.fillRect(0, 0, size, size);
}

function toTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}

// --- Building facade: smooth gradient + rounded-corner lit windows + soft
// floor bands. Tileable window grid; repeat is set per building size.
export function facadeTexture(palette, seed = 1) {
  const S = 1024;
  const [c, ctx] = makeCanvas(S);
  const rng = mulberry32(seed);
  baseGradient(ctx, S, [
    [0, palette.top], [0.55, palette.mid], [1, palette.bottom],
  ]);
  softSpeckle(ctx, S, rng, 1300, 0.05);
  softSpeckle(ctx, S, rng, 900, 0.05, false);
  const cols = 8, rows = 12;
  const cw = S / cols, rh = S / rows;
  for (let r = 0; r < rows; r++) {
    // soft floor band
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, r * rh + rh - 6, S, 6);
    for (let col = 0; col < cols; col++) {
      const x = col * cw + cw * 0.22, y = r * rh + rh * 0.22;
      const w = cw * 0.56, h = rh * 0.52;
      const lit = rng() < 0.42;
      const wg = ctx.createLinearGradient(x, y, x, y + h);
      if (lit) { wg.addColorStop(0, '#ffe9a8'); wg.addColorStop(1, '#f7b95c'); }
      else { wg.addColorStop(0, '#3d5a74'); wg.addColorStop(1, '#22364a'); }
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 7);
      ctx.fill();
      // soft window frame highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2; ctx.stroke();
      // mullion cross, softly drawn
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + w / 2 - 1, y, 2, h);
      ctx.fillRect(x, y + h / 2 - 1, w, 2);
    }
  }
  return toTexture(c);
}

export const FACADE_PALETTES = [
  { top: '#f2c98f', mid: '#e8b878', bottom: '#c98f52' },
  { top: '#f7d9a0', mid: '#eec27e', bottom: '#d9a05e' },
  { top: '#dfe9ee', mid: '#c3d4de', bottom: '#9fb4c2' },
  { top: '#f0b48e', mid: '#dd9268', bottom: '#b96f45' },
  { top: '#efe3c2', mid: '#dcc795', bottom: '#b89f68' },
];

// --- Road: smooth asphalt gradient across the width, subtle aggregate noise,
// soft-edged double yellow centre lines and soft white dashes. No hard banding.
export function roadTexture(seed = 7) {
  const S = 1024;
  const [c, ctx] = makeCanvas(S);
  const rng = mulberry32(seed);
  baseGradient(ctx, S, [[0, '#565660'], [0.5, '#48484f'], [1, '#3e3e45']]);
  softSpeckle(ctx, S, rng, 2400, 0.06);
  softSpeckle(ctx, S, rng, 1700, 0.06, false);
  // faint tyre-wear sheen down each lane
  for (const cx of [S * 0.25, S * 0.75]) {
    const g = ctx.createLinearGradient(cx - 130, 0, cx + 130, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 130, 0, 260, S);
  }
  // double yellow centre lines, soft edges via a horizontal gradient mask
  for (const cx of [S * 0.485, S * 0.515]) {
    const g = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0);
    g.addColorStop(0, 'rgba(240,190,40,0)');
    g.addColorStop(0.35, 'rgba(240,190,40,0.95)');
    g.addColorStop(0.65, 'rgba(240,190,40,0.95)');
    g.addColorStop(1, 'rgba(240,190,40,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 14, 0, 28, S);
  }
  // soft white lane dashes (edges fade vertically)
  ctx.fillStyle = '#e8e8e8';
  for (const cx of [S * 0.25, S * 0.75]) {
    for (let y = 0; y < S; y += 256) {
      const g = ctx.createLinearGradient(0, y, 0, y + 128);
      g.addColorStop(0, 'rgba(232,232,232,0)');
      g.addColorStop(0.25, 'rgba(232,232,232,0.9)');
      g.addColorStop(0.75, 'rgba(232,232,232,0.9)');
      g.addColorStop(1, 'rgba(232,232,232,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 5, y, 10, 128);
    }
  }
  return toTexture(c);
}

// Warm wet sunset variant of the road: amber gradient + neon streak reflections.
export function sunsetRoadTexture(seed = 9) {
  const S = 1024;
  const [c, ctx] = makeCanvas(S);
  const rng = mulberry32(seed);
  baseGradient(ctx, S, [[0, '#6b3a2e'], [0.5, '#54301f'], [1, '#452414']]);
  softSpeckle(ctx, S, rng, 2000, 0.05);
  softSpeckle(ctx, S, rng, 1400, 0.05, false);
  // neon streaks: soft vertical ribbons of pink / cyan reflected in the wet road
  for (const [cx, color] of [[S * 0.2, '255,90,140'], [S * 0.45, '80,220,255'], [S * 0.8, '255,120,80']]) {
    const g = ctx.createLinearGradient(cx - 46, 0, cx + 46, 0);
    g.addColorStop(0, `rgba(${color},0)`);
    g.addColorStop(0.5, `rgba(${color},0.28)`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.fillRect(cx - 46, 0, 92, S);
  }
  for (const cx of [S * 0.485, S * 0.515]) {
    const g = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0);
    g.addColorStop(0, 'rgba(255,205,80,0)');
    g.addColorStop(0.35, 'rgba(255,205,80,0.95)');
    g.addColorStop(0.65, 'rgba(255,205,80,0.95)');
    g.addColorStop(1, 'rgba(255,205,80,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 14, 0, 28, S);
  }
  return toTexture(c);
}

// --- Beach sand: warm gradient, dense soft speckle, a soft wet band at the
// waterline so the sand meets the ocean without a hard line.
export function beachTexture(seed = 11) {
  const S = 1024;
  const [c, ctx] = makeCanvas(S);
  const rng = mulberry32(seed);
  baseGradient(ctx, S, [[0, '#f2ddab'], [0.6, '#e8c98d'], [1, '#d9b478']]);
  softSpeckle(ctx, S, rng, 3000, 0.07);
  softSpeckle(ctx, S, rng, 1900, 0.06, false);
  // soft dune ripples
  for (let i = 0; i < 26; i++) {
    const y = rng() * S;
    const g = ctx.createLinearGradient(0, y - 18, 0, y + 18);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 18, S, 36);
  }
  return toTexture(c);
}

// --- Ocean: deep-to-shallow blue gradient with soft, drifting foam streaks.
export function oceanTexture(seed = 13) {
  const S = 1024;
  const [c, ctx] = makeCanvas(S);
  const rng = mulberry32(seed);
  baseGradient(ctx, S, [[0, '#1d7fb8'], [0.45, '#2a9ad0'], [1, '#57c2e8']]);
  for (let i = 0; i < 60; i++) {
    const y = rng() * S, w = 120 + rng() * 420, x = rng() * S;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,255,${0.05 + rng() * 0.09})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x + w / 2, y, w / 2, 5 + rng() * 9, 0, 0, Math.PI * 2); ctx.fill();
  }
  softSpeckle(ctx, S, rng, 1000, 0.04);
  return toTexture(c);
}

// --- Sidewalk paving: warm grey gradient + soft tile joints.
export function sidewalkTexture(seed = 15) {
  const S = 512;
  const [c, ctx] = makeCanvas(S);
  const rng = mulberry32(seed);
  baseGradient(ctx, S, [[0, '#c9bfb0'], [0.5, '#b5aa97'], [1, '#a89d89']]);
  softSpeckle(ctx, S, rng, 1800, 0.05);
  ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * 128, 0); ctx.lineTo(i * 128, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 128); ctx.lineTo(S, i * 128); ctx.stroke();
  }
  return toTexture(c);
}

// --- Neon sign panel: rounded dark board, glowing letters. The panel is wide
// enough for the whole word — never split by a prop in front of it.
export function neonSignTexture(text, fg = '#ff5fa8', bg = '#1c1030', seed = 17) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  const rng = mulberry32(seed);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, bg); g.addColorStop(1, '#0c0618');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(6, 6, 1012, 244, 28); ctx.fill();
  ctx.strokeStyle = fg; ctx.lineWidth = 5;
  ctx.shadowColor = fg; ctx.shadowBlur = 26;
  ctx.beginPath(); ctx.roundRect(14, 14, 996, 228, 22); ctx.stroke();
  ctx.font = 'bold 150px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  ctx.shadowBlur = 34;
  ctx.fillText(text, 512, 138);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 148px Arial, sans-serif';
  ctx.fillText(text, 512, 138);
  softSpeckle(ctx, 256, rng, 300, 0.03);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// --- Police door: white panel, full POLICE word in bold black, star badge.
// Wide canvas so the whole word fits — v12's door cut it to "POLIC".
export function policeDoorTexture(seed = 19) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const rng = mulberry32(seed);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dfe6ea');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
  softSpeckle(ctx, 512, rng, 500, 0.03, false);
  ctx.fillStyle = '#101418';
  ctx.font = 'bold 190px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('POLICE', 512, 210);
  // star badge left of the word
  ctx.fillStyle = '#1a5fb4';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 62 : 26;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](150 + Math.cos(a) * r, 400 + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px Arial, sans-serif';
  ctx.fillText('KPD', 150, 402);
  ctx.fillStyle = '#101418';
  ctx.font = 'bold 56px Arial, sans-serif';
  ctx.fillText('KUMALA PD', 560, 420);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// --- Soft cloud puff: pure white radial gradient, alpha fading to zero at
// every edge. Sprites built from this are white ALL OVER — no grey pancake
// undersides, ever.
export function cloudPuffTexture(seed = 23) {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  const rng = mulberry32(seed);
  // layered puffs: several offset radial blobs merged into one soft mass
  const blobs = [
    [128, 150, 96], [82, 160, 62], [176, 158, 66], [108, 118, 58], [152, 122, 54], [128, 168, 80],
  ];
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  softSpeckle(ctx, S, rng, 120, 0.02);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- Striped awning: soft alternating bands with a smooth gradient overlay.
export function awningTexture(colorA = '#ff5f8f', colorB = '#fff4f6', seed = 29) {
  const S = 512;
  const [c, ctx] = makeCanvas(S);
  const rng = mulberry32(seed);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.fillRect(i * 64, 0, 64, S);
  }
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  softSpeckle(ctx, S, rng, 500, 0.04);
  return toTexture(c);
}

// --- District billboard: big smooth gradient + bold title text.
export function billboardTexture(title, sub, seed = 31) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const rng = mulberry32(seed);
  const g = ctx.createLinearGradient(0, 0, 1024, 512);
  g.addColorStop(0, '#ff7a3c'); g.addColorStop(0.5, '#ff4d6d'); g.addColorStop(1, '#7a3cff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
  softSpeckle(ctx, 512, rng, 700, 0.04);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 120px Arial, sans-serif';
  ctx.fillText(title, 512, 240);
  ctx.font = 'bold 54px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(sub, 512, 330);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
