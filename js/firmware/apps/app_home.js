/**
 * Pulpit. Sześć ikon na jednej stronie, każda wyśrodkowana w ramce.
 * Alerty nie są ikoną: liczba siedzi obok godziny, a ▲ wysuwa roletę.
 */

import { BTN_BACK, BTN_OK, BTN_UP } from "../nimo_config.js";
import { display_fill_rect, display_fill_round, display_pixel, display_round, display_text, display_text_center, text_width } from "../nimo_display.js";
import { nav_delta, press } from "../nimo_input.js";
import { notes_collect } from "../nimo_notes.js";
import { os_launch } from "../nimo_os.js";
import { theme_mark } from "../nimo_theme.js";
import {
  battery_pct,
  clock_str,
  dialog_draw,
  draw_battery,
  menu_draw,
  menu_move,
  trunc,
  ui_set,
} from "../nimo_ui.js";

const MODE_GRID = 0;
const MODE_NOTES = 1;
const MODE_POWER = 2;

const COLS = 3;
const PLATE_W = 34;
const PLATE_H = 19;
const GAP_X = 6;
const GAP_Y = 3;
const ORIGIN_X = 7;
const ORIGIN_Y = 10;
const SHADE_FULL = 56;

const APPS = [
  { id: "chat", label: "Czat", icon: "chat" },
  { id: "games", label: "Gierki", icon: "pad" },
  { id: "clock", label: "Zegar", icon: "clock" },
  { id: "pad", label: "Lista", icon: "list" },
  { id: "torch", label: "Latarka", icon: "torch" },
  { id: "settings", label: "Ustawienia", icon: "gear" },
];

const st = {
  mode: MODE_GRID,
  sel: 0,
  nsel: 0,
  ntop: 0,
  psel: 1,
  shade: 0,
  shadeH: 0,
};

function slot_at(i) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return {
    x: ORIGIN_X + col * (PLATE_W + GAP_X),
    y: ORIGIN_Y + row * (PLATE_H + GAP_Y),
  };
}

function open_note(os, note) {
  if (!note) return;
  if (note.app === "chat") {
    os.intent = { contact: note.contact };
    os_launch("chat");
    return;
  }
  if (note.app === "alarm") {
    os.intent = Object.assign({}, os.intent, { tool: "done" });
    os_launch("clock");
    return;
  }
  if (note.app) os_launch(note.app);
}

function close_shade() {
  st.shade = 0;
  st.shadeH = 0;
  st.mode = MODE_GRID;
}

export const app_home = {
  id: "home",
  on_enter() {
    st.mode = MODE_GRID;
    st.psel = 1;
    close_shade();
  },
  on_resume() {
    st.mode = MODE_GRID;
    st.psel = 1;
    close_shade();
  },
  on_exit() {},
  on_input(os, ev) {
    if (st.mode === MODE_POWER) {
      const dir = nav_delta(ev);
      if (dir) st.psel = st.psel ? 0 : 1;
      if (press(ev, BTN_OK)) {
        if (st.psel === 0) os_launch("sleep");
        else st.mode = MODE_GRID;
      }
      if (press(ev, BTN_BACK)) st.mode = MODE_GRID;
      return;
    }
    if (st.mode === MODE_NOTES) {
      const notes = notes_collect(os);
      const menu = { items: notes, sel: st.nsel, top: st.ntop };
      const dir = nav_delta(ev);
      if (dir && notes.length && st.shade !== 3) {
        menu_move(menu, dir, 3);
        st.nsel = menu.sel;
        st.ntop = menu.top;
      }
      if (press(ev, BTN_OK) && notes.length && notes[st.nsel] && notes[st.nsel].app) {
        open_note(os, notes[st.nsel]);
      }
      if (press(ev, BTN_BACK)) st.shade = 3;
      return;
    }
    if (press(ev, BTN_UP)) {
      st.mode = MODE_NOTES;
      st.nsel = 0;
      st.ntop = 0;
      st.shade = 1;
      return;
    }
    const dir = nav_delta(ev);
    if (dir > 0) st.sel = (st.sel + 1) % APPS.length;
    if (press(ev, BTN_OK)) {
      const app = APPS[st.sel];
      if (app) os_launch(app.id);
    }
    if (press(ev, BTN_BACK)) {
      st.mode = MODE_POWER;
      st.psel = 1;
    }
  },
  on_tick(os, dt) {
    const step = Math.max(12, Math.floor((dt | 0) * 0.9));
    if (st.shade === 1) {
      st.shadeH = Math.min(SHADE_FULL, st.shadeH + step);
      if (st.shadeH >= SHADE_FULL) st.shade = 2;
    } else if (st.shade === 3) {
      st.shadeH = Math.max(0, st.shadeH - step);
      if (st.shadeH <= 0) close_shade();
    }
    void os;
  },
  on_draw(os, d) {
    draw_grid(os, d);
    if (st.mode === MODE_NOTES || st.shadeH) draw_shade(os, d);
    if (st.mode === MODE_POWER) {
      dialog_draw(d, "Uśpić nimo?", ["Tak", "Nie"], st.psel);
      ui_set(os, ["wybór", "wybór", "zatwierdź", "anuluj"], -1);
    }
  },
};

function draw_chevron(d, x, y, up) {
  if (up) {
    display_pixel(d, x + 2, y, 1);
    display_pixel(d, x + 1, y + 1, 1);
    display_pixel(d, x + 3, y + 1, 1);
    display_pixel(d, x, y + 2, 1);
    display_pixel(d, x + 4, y + 2, 1);
    return;
  }
  display_pixel(d, x, y, 1);
  display_pixel(d, x + 4, y, 1);
  display_pixel(d, x + 1, y + 1, 1);
  display_pixel(d, x + 3, y + 1, 1);
  display_pixel(d, x + 2, y + 2, 1);
}

function draw_status(d, os, notes) {
  const ts = clock_str(os);
  display_text(d, 2, 0, ts, 1);
  let x = 2 + text_width(ts) + 3;
  draw_chevron(d, x, 2, st.mode === MODE_NOTES);
  x += 8;
  if (notes.length) {
    const label = notes.length > 9 ? "9" : String(notes.length);
    display_text(d, x, 0, label, 1);
  }
  draw_battery(d, 117, 1, battery_pct(os), 1);
}

function draw_grid(os, d) {
  const notes = notes_collect(os);
  draw_status(d, os, notes);
  const frame = theme_mark() === 1;
  for (let i = 0; i < APPS.length; i++) {
    const slot = slot_at(i);
    const on = i === st.sel && st.mode === MODE_GRID;
    if (on && !frame) display_fill_round(d, slot.x, slot.y, PLATE_W, PLATE_H, 1, 3);
    else display_round(d, slot.x, slot.y, PLATE_W, PLATE_H, 1, 3);
    draw_icon(d, APPS[i].icon, slot.x, slot.y, PLATE_W, PLATE_H, on && !frame ? 0 : 1);
  }
  const app = APPS[st.sel];
  display_text_center(d, 56, trunc(app ? app.label : "", 21), 1);
  ui_set(os, ["alerty", "dalej", "otwórz", "uśpij"], -1, {
    subs: ["", "", app ? app.label : "", ""],
  });
}

function short_body(body, room) {
  const text = String(body || "");
  const idx = text.search(/[.!?]/);
  if (idx >= 0 && idx + 1 <= room) return text.slice(0, idx + 1);
  return trunc(text, room);
}

function note_line(note) {
  const title = note.title || "";
  const room = 18 - Array.from(title).length - 1;
  const body = room > 3 ? short_body(note.body, room) : "";
  return body ? title + " " + body : title;
}

function draw_shade(os, d) {
  const h = st.shadeH | 0;
  if (h < 4) return;
  const y = 8;
  display_fill_rect(d, 0, y, 128, h, 0);
  display_round(d, 1, y, 126, Math.max(6, h), 1, 3);
  if (h > 8) display_fill_round(d, 58, y + h - 4, 12, 2, 1, 1);
  if (h < 40) return;
  const notes = notes_collect(os);
  if (st.nsel >= notes.length) st.nsel = Math.max(0, notes.length - 1);
  if (!notes.length) {
    display_text_center(d, 26, "Spokój.", 1);
    display_text_center(d, 36, "Nic nowego.", 1);
    ui_set(os, ["", "", "", "zamknij"], -1);
    return;
  }
  const items = notes.map((n) => ({ label: trunc(note_line(n), 18) }));
  const menu = { items, sel: st.nsel, top: st.ntop };
  menu_draw(d, menu, 0, 12, 128, 33, 11);
  st.ntop = menu.top;
  const open = notes[st.nsel] && notes[st.nsel].app ? "otwórz" : "";
  ui_set(os, ["wyżej", "niżej", open, "zamknij"], -1);
}

function blit(d, x, y, rows, color) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === "#") display_pixel(d, x + c, y + r, color);
    }
  }
}

function ink_box(rows) {
  let minX = 99;
  let minY = 99;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== "#") continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return { minX: 0, minY: 0, w: 0, h: 0 };
  return { minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function draw_icon(d, kind, plateX, plateY, plateW, plateH, color) {
  const art = ICONS[kind];
  if (!art) return;
  const box = ink_box(art);
  const ix = plateX + Math.floor((plateW - box.w) / 2) - box.minX;
  const iy = plateY + Math.floor((plateH - box.h) / 2) - box.minY;
  blit(d, ix, iy, art, color);
}

const ICONS = {
  chat: [
    "...##########...",
    "..#..........#..",
    ".#............#.",
    ".#....####....#.",
    ".#............#.",
    "..#..........#..",
    "...##########...",
    "......##........",
    ".......#........",
  ],
  pad: [
    "...##########...",
    ".##..........##.",
    "#..#......##..#.",
    "#.###....#.#..#.",
    "#..#......##..#.",
    ".##..........##.",
    "...##########...",
    ".....#....#.....",
  ],
  clock: [
    "...............",
    ".....#####.....",
    "....##...##....",
    "...#...#...#...",
    "..#....#....#..",
    ".##....#....##.",
    ".#.....#.....#.",
    ".#.....##....#.",
    ".#.......###.#.",
    ".##.........##.",
    "..#.........#..",
    "...#.......#...",
    "....##...##....",
    ".....#####.....",
    "...............",
  ],
  list: [
    ".##.##########.",
    ".##.##########.",
    "...............",
    ".##.##########.",
    ".##.##########.",
    "...............",
    ".##.##########.",
    ".##.##########.",
  ],
  torch: [
    "##..............",
    ".##.............",
    "..##...######...",
    "...##.##....##..",
    "....##...##..#..",
    "...##.##....##..",
    "..##...######...",
    ".##.............",
    "##..............",
  ],
  gear: [
    ".......#........",
    "....#######.....",
    "..##..#.#..##...",
    ".#...#####...#..",
    "#...##...##...#.",
    "####.......####.",
    "#...##...##...#.",
    ".#...#####...#..",
    "..##..#.#..##...",
    "....#######.....",
    ".......#........",
  ],
};
