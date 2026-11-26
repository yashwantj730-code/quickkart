import * as THREE from 'three';

const cache = new Map();
function canvasTex(key, w, h, draw, { repeat } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  cache.set(key, t);
  return t;
}

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
const ink = (hex) => (lum(hex) > 0.62 ? '#1b1b1b' : '#ffffff');

function wrapText(g, text, x, y, maxW, lh, maxLines = 3) {
  const words = text.split(' ');
  let line = '', lines = [];
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  lines.push(line);
  lines = lines.slice(0, maxLines);
  lines.forEach((l, i) => g.fillText(l, x, y + i * lh));
  return lines.length;
}

// Front label for packaged goods
export function labelTexture(p) {
  return canvasTex(`label-${p.id}-${p.name}-${p.color}`, 128, 168, (g, w, h) => {
    g.fillStyle = p.color; g.fillRect(0, 0, w, h);
    const fg = ink(p.color);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, w, 34);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 19px system-ui, sans-serif';
    g.fillText((p.brand || '').slice(0, 12).toUpperCase(), w / 2, 18);
    g.font = '44px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.fillText(p.emoji || '🛒', w / 2, 70);
    g.font = 'bold 15px system-ui, sans-serif';
    wrapText(g, p.name.replace(p.brand, '').trim() || p.name, w / 2, 110, w - 12, 16, 2);
    g.font = '13px system-ui, sans-serif';
    g.fillText(p.unit || '', w / 2, 152);
  });
}

// Wrap-around label for bottles/cans (wider aspect)
export function wrapTexture(p) {
  return canvasTex(`wrap-${p.id}-${p.name}-${p.color}`, 256, 96, (g, w, h) => {
    g.fillStyle = p.color; g.fillRect(0, 0, w, h);
    const fg = ink(p.color);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, h * 0.3, w, h * 0.4);
    g.fillStyle = '#1b1b1b'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 22px system-ui, sans-serif';
    g.fillText((p.brand || p.name).slice(0, 14), w * 0.5, h * 0.5);
    g.fillStyle = fg; g.font = 'bold 14px system-ui, sans-serif';
    g.fillText(p.unit || '', w * 0.5, h * 0.15);
    g.fillText(p.unit || '', w * 0.5, h * 0.86);
  });
}

// Shelf-edge price tag: name + ₹price + MRP strike
export function priceTagTexture(p) {
  return canvasTex(`tag-${p.id}-${p.price}-${p.mrp}-${p.name}`, 256, 72, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd60a'; g.fillRect(0, 0, 10, h);
    g.fillStyle = '#1b1b1b'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = 'bold 18px system-ui, sans-serif';
    let name = p.name; while (g.measureText(name).width > 160 && name.length > 4) name = name.slice(0, -2);
    if (name !== p.name) name += '…';
    g.fillText(name, 18, 22);
    g.font = '14px system-ui, sans-serif'; g.fillStyle = '#555';
    g.fillText(p.unit || '', 18, 50);
    g.textAlign = 'right'; g.fillStyle = '#0c831f'; g.font = 'bold 30px system-ui, sans-serif';
    g.fillText(`₹${p.price}`, w - 10, 26);
    if (p.mrp > p.price) {
      g.font = '15px system-ui, sans-serif'; g.fillStyle = '#888';
      const t = `₹${p.mrp}`; g.fillText(t, w - 10, 54);
      const tw = g.measureText(t).width; g.fillRect(w - 10 - tw, 54, tw, 1.5);
    }
  });
}

export function signTexture(label, color, icon, aisle) {
  return canvasTex(`sign-${label}`, 512, 128, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, h - 18, w, 18);
    g.fillStyle = '#ffd60a'; g.fillRect(0, 0, 96, h);
    g.fillStyle = '#1b1b1b'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 40px system-ui, sans-serif'; g.fillText(aisle, 48, h / 2);
    g.font = '46px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.fillText(icon, 140, h / 2);
    g.fillStyle = '#ffffff'; g.textAlign = 'left';
    let fs = 40; g.font = `bold ${fs}px system-ui, sans-serif`;
    while (g.measureText(label).width > w - 196 && fs > 22) { fs -= 2; g.font = `bold ${fs}px system-ui, sans-serif`; }
    g.fillText(label, 180, h / 2 - 2);
  });
}

export function textTexture(key, text, { bg = '#0c831f', fg = '#fff', w = 512, h = 128, font = 'bold 60px system-ui, sans-serif' } = {}) {
  return canvasTex(`txt-${key}`, w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font;
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

export function floorTexture() {
  return canvasTex('floor', 256, 256, (g, w, h) => {
    g.fillStyle = '#eef1ee'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e3e8e4'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2);
    g.strokeStyle = '#d3d9d5'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  }, { repeat: [20, 16] });
}
