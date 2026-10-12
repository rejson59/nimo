/**
 * Widżety 1-bit: pasek, stopka, lista, dialog, ikony.
 * Rysują wyłącznie przez nimo_display — bez wiedzy o canvas.
 */

import { theme_mark } from "./nimo_theme.js";
import {
  display_fill_rect,
  display_fill_round,
  display_hline,
  display_pixel,
  display_rect,
  display_round,
  display_text,
  display_vline,
  text_width,
} from "./nimo_display.js";

export function trunc(str, n) {
  const a = Array.from(str);
  if (a.length <= n) return str;
  return a.slice(0, Math.max(0, n - 1)).join("") + "…";
}

export function wrap_lines(text, cols) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const out = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if (Array.from(cur).length + 1 + Array.from(w).length <= cols) cur += " " + w;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  const lines = [];
  for (const line of out) {
    const a = Array.from(line);
    if (a.length <= cols) lines.push(line);
    else {
      for (let i = 0; i < a.length; i += cols) lines.push(a.slice(i, i + cols).join(""));
    }
  }
  return lines.length ? lines : [""];
}

export function clock_str(os) {
  const h = String(os.hour | 0).padStart(2, "0");
  const m = String(os.minute | 0).padStart(2, "0");
  return h + ":" + m;
}

export function battery_pct(os) {
  const mins = Math.floor((os.uptime_ms || 0) / 60000);
  return Math.max(7, 90 - mins * 2);
}

export function draw_battery(d, x, y, pct, color = 1) {
  display_rect(d, x, y, 9, 6, color);
  display_fill_rect(d, x + 9, y + 2, 1, 2, color);
  const bars = Math.max(0, Math.min(6, Math.round((pct / 100) * 6)));
  if (bars) display_fill_rect(d, x + 1, y + 1, bars, 4, color);
}

export function ui_header(d, os, title, opts = {}) {
  display_text(d, 2, 0, trunc(title, 13), 1);
  if (!opts.plain) {
    draw_battery(d, 117, 1, battery_pct(os), 1);
    const ts = clock_str(os);
    display_text(d, 114 - text_width(ts), 0, ts, 1);
  }
}

export function ui_footer(d, hint) {
  display_text(d, 2, 57, trunc(hint, 20), 1);
}

export function ui_set(os, hints, highlight = -1, extra = {}) {
  const h = hints.slice(0, 4);
  while (h.length < 4) h.push("");
  os.ui.hints = h;
  os.ui.subs = extra.subs || ["", "", "", ""];
  os.ui.highlight = highlight;
  os.ui.text_entry = extra.text || false;
}

export function menu_move(menu, dir, win) {
  const n = menu.items.length;
  if (!n) return;
  menu.sel = (menu.sel + (dir > 0 ? 1 : -1) + n) % n;
  if (win < 1) win = 1;
  if (menu.sel < menu.top) menu.top = menu.sel;
  if (menu.sel >= menu.top + win) menu.top = menu.sel - win + 1;
}

export function menu_draw(d, menu, x, y, w, h, itemH) {
  const win = Math.max(1, Math.floor(h / itemH));
  const n = menu.items.length;
  if (menu.top > Math.max(0, n - win)) menu.top = Math.max(0, n - win);
  if (menu.sel < menu.top) menu.top = menu.sel;
  if (n && menu.sel >= menu.top + win) menu.top = Math.max(0, menu.sel - win + 1);
  const showBar = n > win;
  const innerW = showBar ? w - 5 : w;
  for (let i = 0; i < win && menu.top + i < n; i++) {
    const idx = menu.top + i;
    const iy = y + i * itemH;
    const item = menu.items[idx];
    const on = idx === menu.sel;
    const frame = theme_mark() === 1;
    const px = x + 2;
    const py = iy + 1;
    const pw = Math.max(4, innerW - 4);
    const ph = Math.max(4, itemH - 2);
    let col = 1;
    if (on && frame) display_round(d, px, py, pw, ph, 1, 3);
    else if (on) {
      display_fill_round(d, px, py, pw, ph, 1, 3);
      col = 0;
    }
    const ty = py + Math.max(0, Math.floor((ph - 7) / 2));
    let tx = px + 4;
    if (item.icon) {
      item.icon(d, x + 2, iy + Math.max(0, Math.floor((itemH - 9) / 2)), col);
      tx = x + 13;
    }
    display_text(d, tx, ty, item.label, col);
    if (item.value) {
      const vw = text_width(item.value);
      display_text(d, px + pw - vw - 4, ty, item.value, col);
    }
  }
  if (showBar) {
    const trackX = x + w - 2;
    const trackH = Math.max(4, win * itemH - 2);
    display_vline(d, trackX, y, trackH, 1);
    const thumb = Math.max(4, Math.floor((trackH * win) / n));
    const travel = trackH - thumb;
    const span = Math.max(1, n - win);
    const ty = y + Math.floor((travel * menu.top) / span);
    display_fill_round(d, trackX - 1, ty, 3, thumb, 1, 1);
  }
}

export function dialog_draw(d, title, options, sel) {
  const w = 112;
  const h = 16 + options.length * 12 + 6;
  const x = Math.floor((128 - w) / 2);
  const y = Math.floor((64 - h) / 2);
  display_fill_rect(d, 0, 9, 128, 55, 0);
  display_round(d, x, y, w, h, 1, 3);
  display_text(d, x + 6, y + 4, trunc(title, 16), 1);
  for (let i = 0; i < options.length; i++) {
    const iy = y + 15 + i * 12;
    const on = i === sel;
    const frame = theme_mark() === 1;
    if (on && frame) display_round(d, x + 5, iy - 1, w - 10, 10, 1, 3);
    else if (on) display_fill_round(d, x + 5, iy - 1, w - 10, 10, 1, 3);
    display_text(d, x + 8, iy, options[i], on && !frame ? 0 : 1);
  }
}

function blit(d, x, y, rows, color) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] === "#") display_pixel(d, x + c, y + r, color);
    }
  }
}

export function icon_chat(d, x, y, c) {
  blit(d, x, y, [
    ".#####..",
    "#.....#.",
    "#.#.#.#.",
    "#.....#.",
    ".##.###.",
    "..#.....",
    ".#......",
    "........",
  ], c);
}

export function icon_game(d, x, y, c) {
  blit(d, x, y, [
    "........",
    "..#.....",
    "..##....",
    "..###...",
    "..####..",
    "..###...",
    "..##....",
    "..#.....",
  ], c);
}

export function icon_gear(d, x, y, c) {
  blit(d, x, y, [
    "########",
    "##......",
    "##......",
    "########",
    ".....##.",
    ".....##.",
    "########",
    "........",
  ], c);
}

/** Duży znak przycisku na samouczku (prawa strona OLED). */
export function draw_mark(d, kind, x, y) {
  if (kind === "up") {
    for (let i = 0; i < 6; i++) {
      display_hline(d, x + 7 - i, y + i, 2 + i * 2, 1);
    }
    display_fill_rect(d, x + 6, y + 6, 4, 8, 1);
  } else if (kind === "down") {
    display_fill_rect(d, x + 6, y + 1, 4, 8, 1);
    for (let i = 0; i < 6; i++) {
      display_hline(d, x + 2 + i, y + 9 + i, 12 - i * 2, 1);
    }
  } else if (kind === "ok") {
    display_fill_rect(d, x + 3, y + 3, 10, 10, 1);
    display_fill_rect(d, x + 6, y + 6, 4, 4, 0);
  } else if (kind === "back") {
    for (let i = 0; i < 6; i++) {
      display_hline(d, x + 2 + i, y + i, 10 - i, 1);
      display_hline(d, x + 2 + i, y + 12 - i, 10 - i, 1);
    }
    display_fill_rect(d, x + 8, y + 6, 6, 3, 1);
  }
}
