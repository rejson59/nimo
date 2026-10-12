/**
 * Pulpit. Cztery ikony, bez pełnych pasków zaznaczenia —
 * zaznaczenie to sama ikona, reszta zostaje cicha.
 * Alerty to panel powiadomień, nie piąty krzyk na ekranie.
 */

import { BTN_BACK, BTN_OK } from "../nimo_config.js";
import { display_fill_rect, display_pixel, display_rect, display_text, display_text_center, text_width } from "../nimo_display.js";
import { nav_delta, press } from "../nimo_input.js";
import { notes_collect } from "../nimo_notes.js";
import { os_launch } from "../nimo_os.js";
import { theme_mark, theme_of } from "../nimo_theme.js";
import {
  battery_pct,
  clock_str,
  dialog_draw,
  draw_battery,
  menu_draw,
  menu_move,
  trunc,
  ui_footer,
  ui_header,
  ui_set,
} from "../nimo_ui.js";

const MODE_GRID = 0;
const MODE_NOTES = 1;
const MODE_POWER = 2;

const PAGE = 4;
const APPS = [
  { id: "chat", label: "Czat", icon: "chat" },
  { id: "games", label: "Gierki", icon: "play" },
  { id: "tools", label: "Narzędzia", icon: "box" },
  { id: "notes", label: "Alerty", icon: "bell" },
  { id: "pad", label: "Lista", icon: "list" },
  { id: "clock", label: "Zegar", icon: "clock" },
  { id: "torch", label: "Latarka", icon: "sun" },
  { id: "settings", label: "Ustawienia", icon: "sliders" },
];

const SLOTS = [
  { x: 24, y: 14 },
  { x: 88, y: 14 },
  { x: 24, y: 36 },
  { x: 88, y: 36 },
];

const st = {
  mode: MODE_GRID,
  sel: 0,
  nsel: 0,
  ntop: 0,
  psel: 1,
};

function contrast_label(v) {
  return Math.round((v / 255) * 100) + "%";
}

function caption(os, notes) {
  const app = APPS[st.sel];
  if (!app) return "";
  if (app.id === "chat") {
    const n = notes.filter((x) => x.app === "chat").length;
    return n ? "Czat - " + n + " nowe" : "Czat - spokój";
  }
  if (app.id === "games") {
    const s = os.settings.snake_best | 0;
    const m = os.settings.memory_best | 0;
    const r = os.settings.react_best | 0;
    if (!s && !m && !r) return "Snake, Pamięć";
    return "S " + s + "  P " + m;
  }
  if (app.id === "tools") return "Stoper, sterownik";
  if (app.id === "pad") return "Lista - " + ((os.pad && os.pad.length) || 0);
  if (app.id === "clock") return "Duży zegar";
  if (app.id === "torch") return "Białe szkło";
  if (app.id === "settings") return theme_of(os).name + " " + contrast_label(os.settings.contrast);
  return notes.length ? "Alerty - " + notes.length : "Alerty - spokój";
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
    os_launch("tools");
    return;
  }
  if (note.app) os_launch(note.app);
}

export const app_home = {
  id: "home",
  on_enter() {
    st.mode = MODE_GRID;
    st.psel = 1;
  },
  on_resume() {
    st.mode = MODE_GRID;
    st.psel = 1;
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
      if (dir && notes.length) {
        menu_move(menu, dir, 4);
        st.nsel = menu.sel;
        st.ntop = menu.top;
      }
      if (press(ev, BTN_OK) && notes.length && notes[st.nsel] && notes[st.nsel].app) {
        open_note(os, notes[st.nsel]);
      }
      if (press(ev, BTN_BACK)) st.mode = MODE_GRID;
      return;
    }
    // Dwie strony po 4 ikony. Dół idzie dalej, także na następną stronę.
    const dir = nav_delta(ev);
    if (dir) st.sel = (st.sel + (dir > 0 ? 1 : -1) + APPS.length) % APPS.length;
    if (press(ev, BTN_OK)) {
      const app = APPS[st.sel];
      if (app.id === "notes") {
        st.mode = MODE_NOTES;
        st.nsel = 0;
        st.ntop = 0;
      } else os_launch(app.id);
    }
    if (press(ev, BTN_BACK)) {
      st.mode = MODE_POWER;
      st.psel = 1;
    }
  },
  on_tick() {},
  on_draw(os, d) {
    if (st.mode === MODE_NOTES) {
      draw_notes(os, d);
      return;
    }
    draw_grid(os, d);
    if (st.mode === MODE_POWER) {
      dialog_draw(d, "Uśpić nimo?", ["Tak", "Nie"], st.psel);
      ui_set(os, ["wybór", "wybór", "zatwierdź", "anuluj"], -1);
    }
  },
};

function draw_status(d, os, notes) {
  display_text(d, 1, 0, clock_str(os), 1);
  if (notes.length) {
    const label = notes.length > 9 ? "9" : String(notes.length);
    display_text(d, 104 - text_width(label), 0, label, 1);
  }
  draw_battery(d, 118, 1, battery_pct(os), 1);
  const pages = Math.ceil(APPS.length / PAGE);
  const page = Math.floor(st.sel / PAGE);
  let dx = 58;
  for (let p = 0; p < pages; p++) {
    if (p === page) display_fill_rect(d, dx, 2, 5, 3, 1);
    else display_pixel(d, dx + 2, 3, 1);
    dx += 7;
  }
  display_pixel(d, 0, 8, 1);
  display_pixel(d, 127, 8, 1);
  for (let x = 2; x < 126; x += 2) display_pixel(d, x, 8, 1);
}

function draw_grid(os, d) {
  const notes = notes_collect(os);
  draw_status(d, os, notes);
  const page = Math.floor(st.sel / PAGE);
  const start = page * PAGE;
  for (let i = 0; i < PAGE && start + i < APPS.length; i++) {
    const slot = SLOTS[i];
    const idx = start + i;
    const on = idx === st.sel && st.mode === MODE_GRID;
    const frame = theme_mark() === 1;
    if (on && frame) display_rect(d, slot.x - 2, slot.y - 2, 20, 20, 1);
    else if (on) display_fill_rect(d, slot.x - 2, slot.y - 2, 20, 20, 1);
    draw_icon(d, APPS[idx].icon, slot.x, slot.y, on && !frame ? 0 : 1);
    const badge = APPS[idx].id === "chat"
      ? notes.some((n) => n.app === "chat")
      : APPS[idx].id === "notes" && notes.length > 0;
    if (badge) display_fill_rect(d, slot.x + 13, slot.y + 13, 3, 3, on ? 0 : 1);
  }
  display_text_center(d, 57, trunc(caption(os, notes), 21), 1);
  ui_set(os, ["poprzednia", "następna", "otwórz", "uśpij"], -1, {
    subs: ["", "", APPS[st.sel].label, ""],
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
  const room = 20 - Array.from(title).length - 1;
  const body = room > 3 ? short_body(note.body, room) : "";
  return body ? title + " " + body : title;
}

function draw_notes(os, d) {
  const notes = notes_collect(os);
  ui_header(d, os, notes.length ? "Alerty " + notes.length : "Alerty");
  if (!notes.length) {
    display_text_center(d, 28, "Spokój.", 1);
    display_text_center(d, 38, "Nic nowego.", 1);
    ui_footer(d, "◄ pulpit");
    ui_set(os, ["", "", "", "pulpit"], -1);
    return;
  }
  const items = notes.map((n) => ({ label: trunc(note_line(n), 20) }));
  const menu = { items, sel: st.nsel, top: st.ntop };
  menu_draw(d, menu, 0, 10, 128, 44, 11);
  st.ntop = menu.top;
  const open = notes[st.nsel] && notes[st.nsel].app ? "otwórz" : "";
  ui_footer(d, open ? "● otwórz   ◄ pulpit" : "◄ pulpit");
  ui_set(os, ["wyżej", "niżej", open, "pulpit"], -1);
}

function blit(d, x, y, rows, color) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] === "#") display_pixel(d, x + c, y + r, color);
    }
  }
}

function draw_icon(d, kind, x, y, color) {
  const art = ICONS[kind];
  if (art) blit(d, x, y, art, color);
}

const ICONS = {
  chat: [
    "................",
    "................",
    "...##########...",
    "...#........#...",
    "...#..##.##.#...",
    "...#........#...",
    "...#..####..#...",
    "...##########...",
    "......##........",
    ".......#........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  play: [
    "................",
    "................",
    "......##........",
    "......###.......",
    "......####......",
    "......#####.....",
    "......######....",
    "......#######...",
    "......######....",
    "......#####.....",
    "......####......",
    "......###.......",
    "......##........",
    "................",
    "................",
    "................",
  ],
  sliders: [
    "................",
    "......####......",
    "..############..",
    "......####......",
    "................",
    "..........####..",
    "..############..",
    "..........####..",
    "................",
    "....####........",
    "..############..",
    "....####........",
    "................",
    "................",
    "................",
    "................",
  ],
  box: [
    "................",
    "................",
    "....##########..",
    "....#........#..",
    "....##########..",
    "...############.",
    "...#...####...#.",
    "...#...####...#.",
    "...#..........#.",
    "...############.",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  list: [
    "................",
    "................",
    ".##..########...",
    ".##..########...",
    "................",
    ".##..######.....",
    ".##..######.....",
    "................",
    ".##..########...",
    ".##..########...",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  clock: [
    "................",
    "................",
    "......####......",
    "....##....##....",
    "...#...##...#...",
    "...#...##...#...",
    "...#.....#..#...",
    "....##....##....",
    "......####......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  sun: [
    "................",
    "................",
    ".......##.......",
    "......####......",
    ".....######.....",
    ".....######.....",
    "......####......",
    ".......##.......",
    "......####......",
    "....########....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  bell: [
    "................",
    "......####......",
    ".....######.....",
    "....########....",
    "...##########...",
    "...##########...",
    "...##########...",
    "..############..",
    "..############..",
    "................",
    ".......##.......",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};
