/**
 * Bufor 128×64, 1 bajt na piksel (0 albo 1).
 * Na ESP32 ten sam zestaw funkcji rysuje przez drawPixel / na końcu klatki
 * pakuje strony SSD1306. Tu nie ma DOM.
 */

import { NIMO_W, NIMO_H } from "./nimo_config.js";
import { CELL_W, font_cols } from "./nimo_font.js";

const missing = new Set();

export function missing_glyphs() {
  return [...missing];
}

export function clear_missing() {
  missing.clear();
}

export function display_create() {
  return {
    w: NIMO_W,
    h: NIMO_H,
    buf: new Uint8Array(NIMO_W * NIMO_H),
  };
}

export function display_clear(d) {
  d.buf.fill(0);
}

export function display_pixel(d, x, y, c) {
  x |= 0;
  y |= 0;
  if (x < 0 || y < 0 || x >= d.w || y >= d.h) return;
  d.buf[y * d.w + x] = c ? 1 : 0;
}

export function display_get(d, x, y) {
  if (x < 0 || y < 0 || x >= d.w || y >= d.h) return 0;
  return d.buf[y * d.w + x];
}

export function display_fill_rect(d, x, y, w, h, c) {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) display_pixel(d, x + xx, y + yy, c);
  }
}

export function display_rect(d, x, y, w, h, c) {
  if (w <= 0 || h <= 0) return;
  display_hline(d, x, y, w, c);
  display_hline(d, x, y + h - 1, w, c);
  display_vline(d, x, y, h, c);
  display_vline(d, x + w - 1, y, h, c);
}

/** Róg ścięty o 1 piksel. Na 128×64 to całe „zaokrąglenie”, jakie szkło uniesie. */
export function display_fill_round(d, x, y, w, h, c) {
  if (w < 3 || h < 3) {
    display_fill_rect(d, x, y, w, h, c);
    return;
  }
  display_fill_rect(d, x + 1, y, w - 2, h, c);
  display_vline(d, x, y + 1, h - 2, c);
  display_vline(d, x + w - 1, y + 1, h - 2, c);
}

export function display_round(d, x, y, w, h, c) {
  if (w < 3 || h < 3) {
    display_rect(d, x, y, w, h, c);
    return;
  }
  display_hline(d, x + 1, y, w - 2, c);
  display_hline(d, x + 1, y + h - 1, w - 2, c);
  display_vline(d, x, y + 1, h - 2, c);
  display_vline(d, x + w - 1, y + 1, h - 2, c);
}

export function display_hline(d, x, y, w, c) {
  for (let i = 0; i < w; i++) display_pixel(d, x + i, y, c);
}

export function display_vline(d, x, y, h, c) {
  for (let i = 0; i < h; i++) display_pixel(d, x, y + i, c);
}

export function display_invert_rect(d, x, y, w, h) {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const px = x + xx;
      const py = y + yy;
      if (px < 0 || py < 0 || px >= d.w || py >= d.h) continue;
      const i = py * d.w + px;
      d.buf[i] = d.buf[i] ? 0 : 1;
    }
  }
}

export function display_glyph(d, x, y, ch, color) {
  const cols = font_cols(ch);
  if (!cols) {
    missing.add(ch);
    display_rect(d, x, y, 5, 7, color);
    return 0;
  }
  for (let c = 0; c < 5; c++) {
    const bits = cols[c];
    for (let r = 0; r < 7; r++) {
      if (bits & (1 << r)) display_pixel(d, x + c, y + r, color);
    }
  }
  return 1;
}

export function display_text(d, x, y, str, color = 1) {
  const chars = Array.from(str);
  for (let i = 0; i < chars.length; i++) {
    display_glyph(d, x + i * CELL_W, y, chars[i], color);
  }
}

export function display_text_x2(d, x, y, str, color = 1) {
  const chars = Array.from(str);
  for (let i = 0; i < chars.length; i++) {
    const cols = font_cols(chars[i]);
    const ox = x + i * CELL_W * 2;
    if (!cols) {
      display_rect(d, ox, y, 10, 14, color);
      continue;
    }
    for (let c = 0; c < 5; c++) {
      const bits = cols[c];
      for (let r = 0; r < 7; r++) {
        if (bits & (1 << r)) display_fill_rect(d, ox + c * 2, y + r * 2, 2, 2, color);
      }
    }
  }
}

export function text_width(str) {
  const n = Array.from(str).length;
  if (!n) return 0;
  return n * CELL_W - 1;
}

export function display_text_center(d, y, str, color = 1) {
  const w = text_width(str);
  display_text(d, Math.max(0, Math.floor((d.w - w) / 2)), y, str, color);
}
