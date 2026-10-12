/**
 * Snake na siatce 32×14 (komórka 4 px). Ściana albo własny ogon = koniec.
 *
 * Sterowanie (inny profil niż menu — opisane w samouczku):
 *   ▲ góra  ▼ dół  ● prawo
 *   ◄ lewo dopiero po puszczeniu (TAP), żeby przytrzymanie mogło być pauzą
 *   przytrzymaj ◄ = pauza
 */

import { BTN_BACK, BTN_DOWN, BTN_OK, BTN_UP, BEEP_DIE, BEEP_EAT } from "../nimo_config.js";
import { display_fill_rect, display_hline, display_pixel, display_text, text_width } from "../nimo_display.js";
import { long, press, tap } from "../nimo_input.js";
import { rand_int, rand_seed } from "../nimo_rand.js";
import { os_persist, os_pop } from "../nimo_os.js";
import { dialog_draw, ui_set } from "../nimo_ui.js";

const COLS = 32;
const ROWS = 14;
const CELL = 4;
const ORIGIN_Y = 8;
const SNAKE_MAX = 80;

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

const st = {
  mode: "intro",
  dir: 1,
  queued: -1,
  body: [],
  food: { x: 10, y: 4 },
  acc: 0,
  score: 0,
  psel: 0,
};

function opp(a, b) {
  return (a + 2) % 4 === b;
}

function place_food() {
  for (let n = 0; n < 80; n++) {
    const x = rand_int(COLS);
    const y = rand_int(ROWS);
    if (!st.body.some((s) => s.x === x && s.y === y)) {
      st.food = { x, y };
      return;
    }
  }
  st.food = { x: 0, y: 0 };
}

function begin(os) {
  st.mode = "play";
  st.dir = 1;
  st.queued = -1;
  st.score = 0;
  st.acc = 0;
  st.psel = 0;
  st.body = [
    { x: 8, y: 7 },
    { x: 7, y: 7 },
    { x: 6, y: 7 },
  ];
  rand_seed((os.uptime_ms ^ 0x9e3779b9) >>> 0 || 1);
  place_food();
}

function remember(os) {
  if (st.score > os.settings.snake_best) {
    os.settings.snake_best = st.score;
    os_persist();
  }
}

function die(os) {
  st.mode = "dead";
  st.psel = 0;
  remember(os);
  os.platform.beep(BEEP_DIE);
}

function win(os) {
  st.mode = "win";
  st.psel = 0;
  remember(os);
  os.platform.beep(BEEP_EAT);
}

function queue_dir(dir) {
  const base = st.queued >= 0 ? st.queued : st.dir;
  if (dir === base || opp(base, dir)) return;
  st.queued = dir;
}

function step(os) {
  if (st.queued >= 0 && !opp(st.dir, st.queued)) st.dir = st.queued;
  st.queued = -1;
  const head = st.body[0];
  const nx = head.x + DX[st.dir];
  const ny = head.y + DY[st.dir];
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return die(os);
  const eating = nx === st.food.x && ny === st.food.y;
  const limit = eating ? st.body.length : st.body.length - 1;
  for (let i = 0; i < limit; i++) {
    if (st.body[i].x === nx && st.body[i].y === ny) return die(os);
  }
  st.body.unshift({ x: nx, y: ny });
  if (!eating) st.body.pop();
  else {
    st.score++;
    os.platform.beep(BEEP_EAT);
    if (st.body.length >= SNAKE_MAX) return win(os);
    place_food();
    remember(os);
  }
}

function cell_xy(x, y) {
  return [x * CELL + 1, ORIGIN_Y + y * CELL + 1];
}

export const app_snake = {
  id: "snake",
  on_enter() {
    st.mode = "intro";
    st.score = 0;
    st.psel = 0;
  },
  on_exit(os) {
    remember(os);
  },
  on_input(os, ev) {
    if (st.mode === "intro") {
      if (press(ev, BTN_OK)) begin(os);
      if (press(ev, BTN_BACK)) os_pop();
      return;
    }
    if (st.mode === "pause") {
      const dir = ev.type === 1 || ev.type === 3 ? (ev.button === BTN_UP ? -1 : ev.button === BTN_DOWN ? 1 : 0) : 0;
      if (dir) st.psel = (st.psel + (dir > 0 ? 1 : -1) + 3) % 3;
      if (press(ev, BTN_OK)) {
        if (st.psel === 0) st.mode = "play";
        else if (st.psel === 1) begin(os);
        else os_pop();
      }
      if (press(ev, BTN_BACK)) st.mode = "play";
      return;
    }
    if (st.mode === "dead" || st.mode === "win") {
      const dir = ev.type === 1 || ev.type === 3 ? (ev.button === BTN_UP ? -1 : ev.button === BTN_DOWN ? 1 : 0) : 0;
      if (dir) st.psel = st.psel ? 0 : 1;
      if (press(ev, BTN_OK)) {
        if (st.psel === 0) begin(os);
        else os_pop();
      }
      if (press(ev, BTN_BACK)) os_pop();
      return;
    }
    if (press(ev, BTN_UP)) queue_dir(0);
    if (press(ev, BTN_DOWN)) queue_dir(2);
    if (press(ev, BTN_OK)) queue_dir(1);
    if (tap(ev, BTN_BACK)) queue_dir(3);
    if (long(ev, BTN_BACK)) {
      st.mode = "pause";
      st.psel = 0;
    }
  },
  on_tick(os, dt) {
    if (st.mode !== "play") return;
    st.acc += dt;
    const interval = Math.max(72, 210 - st.score * 9);
    if (st.acc >= interval) {
      st.acc -= interval;
      step(os);
    }
  },
  on_draw(os, d) {
    if (st.mode === "intro") {
      draw_intro(os, d);
      return;
    }
    draw_field(os, d);
    if (st.mode === "pause") {
      dialog_draw(d, "Pauza", ["Wznów", "Od nowa", "Wyjdź"], st.psel);
      ui_set(os, ["wyżej", "niżej", "wybierz", "wznów"], -1);
    } else if (st.mode === "dead" || st.mode === "win") {
      const title = st.mode === "win" ? "Pełny wąż" : "Wynik " + st.score;
      dialog_draw(d, title, ["Jeszcze raz", "Menu"], st.psel);
      ui_set(os, ["wybór", "wybór", "zatwierdź", "menu"], -1);
    } else {
      ui_set(os, ["góra", "dół", "prawo", "lewo"], -1, {
        subs: ["", "", "", "przytrzymaj: pauza"],
      });
    }
  },
};

function draw_intro(os, d) {
  display_text(d, 1, 0, "Snake", 1);
  const best = "rekord " + os.settings.snake_best;
  display_text(d, 127 - text_width(best), 0, best, 1);
  display_hline(d, 0, 8, 128, 1);
  display_text(d, 2, 14, "▲ góra    ▼ dół", 1);
  display_text(d, 2, 24, "● prawo   ◄ lewo", 1);
  display_text(d, 2, 36, "Przytrzymaj ◄", 1);
  display_text(d, 2, 44, "to pauza.", 1);
  display_text(d, 2, 57, "● start    ◄ wróć", 1);
  ui_set(os, ["góra", "dół", "start", "wróć"], 2);
}

function draw_field(os, d) {
  display_text(d, 1, 0, "Snake", 1);
  const sc = String(st.score);
  display_text(d, 127 - text_width(sc), 0, sc, 1);
  display_hline(d, 0, 7, 128, 1);
  for (let i = 0; i < st.body.length; i++) {
    const s = st.body[i];
    const [x, y] = cell_xy(s.x, s.y);
    display_fill_rect(d, x, y, 3, 3, 1);
  }
  if (st.body.length) {
    const head = st.body[0];
    const [x, y] = cell_xy(head.x, head.y);
    display_pixel(d, x + 1 + DX[st.dir], y + 1 + DY[st.dir], 0);
  }
  const blink = Math.floor(os.now / 280) % 2 === 0;
  if (blink || st.mode !== "play") {
    const [x, y] = cell_xy(st.food.x, st.food.y);
    display_fill_rect(d, x, y, 3, 3, 1);
    display_pixel(d, x + 1, y + 1, 0);
  }
}

export function snake_state() {
  return st;
}
