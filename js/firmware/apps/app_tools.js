/**
 * Narzędzia: stoper, minutnik, kostka.
 * Minutnik zostaje w os.alarm, więc liczy się też po wyjściu z ekranu.
 */

import { BTN_BACK, BTN_OK, BTN_UP } from "../nimo_config.js";
import {
  display_fill_rect,
  display_rect,
  display_text,
  display_text_center,
  display_text_x2,
} from "../nimo_display.js";
import { nav_delta, press } from "../nimo_input.js";
import { rand_int, rand_seed } from "../nimo_rand.js";
import { os_alarm_clear, os_alarm_left, os_alarm_set, os_launch, os_pop } from "../nimo_os.js";
import { menu_draw, menu_move, ui_footer, ui_header, ui_set } from "../nimo_ui.js";

const PRESETS = [
  { label: "15 s", ms: 15000 },
  { label: "30 s", ms: 30000 },
  { label: "1 min", ms: 60000 },
  { label: "3 min", ms: 180000 },
  { label: "5 min", ms: 300000 },
  { label: "25 min", ms: 1500000 },
];

const LIST = [
  { id: "stop", label: "Stoper" },
  { id: "count", label: "Minutnik" },
  { id: "dice", label: "Kostka" },
  { id: "panel", label: "Sterownik" },
];

const st = {
  mode: "list",
  sel: 0,
  top: 0,
  run: 0,
  acc: 0,
  preset: 0,
  face: 1,
  rolling: 0,
  rolls: 0,
};

function pad2(n) {
  return String(n | 0).padStart(2, "0");
}

function fmt_watch(ms) {
  const t = Math.max(0, ms | 0);
  const cs = Math.floor(t / 10) % 100;
  const s = Math.floor(t / 1000) % 60;
  const m = Math.floor(t / 60000);
  return pad2(m) + ":" + pad2(s) + "." + pad2(cs);
}

function fmt_left(ms) {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(s / 60);
  return m + ":" + pad2(s % 60);
}

function big(d, y, str) {
  const w = Array.from(str).length * 12;
  display_text_x2(d, Math.max(0, Math.floor((128 - w) / 2)), y, str, 1);
}

function on_stop(os, ev) {
  if (press(ev, BTN_OK)) st.run = st.run ? 0 : 1;
  if (press(ev, BTN_UP) && !st.run) st.acc = 0;
  if (press(ev, BTN_BACK)) {
    st.run = 0;
    st.mode = "list";
  }
  void os;
}

function on_count(os, ev) {
  const running = os.alarm && !os.alarm.fired;
  if (!running) {
    const dir = nav_delta(ev);
    if (dir) st.preset = (st.preset + (dir > 0 ? 1 : -1) + PRESETS.length) % PRESETS.length;
    if (press(ev, BTN_OK)) os_alarm_set(PRESETS[st.preset].ms, "Minutnik", "koniec");
    if (press(ev, BTN_BACK)) st.mode = "list";
    return;
  }
  if (press(ev, BTN_OK)) os_alarm_clear();
  if (press(ev, BTN_BACK)) os_pop();
}

function on_dice(os, ev) {
  if (press(ev, BTN_OK) && !st.rolling) {
    rand_seed((os.now + os.uptime_ms + 17) >>> 0);
    st.rolling = 1;
    st.rolls = 0;
    st.acc = 0;
    st.face = 1 + rand_int(6);
  }
  if (press(ev, BTN_BACK) && !st.rolling) st.mode = "list";
}

export const app_tools = {
  id: "tools",
  on_enter(os) {
    const want = os.intent && os.intent.tool;
    if (os.intent && os.intent.tool) os.intent.tool = "";
    if (want === "done" || (os.alarm && os.alarm.fired)) {
      st.mode = "done";
      return;
    }
    if (want === "count" || (os.alarm && !os.alarm.fired)) {
      st.mode = "count";
      return;
    }
    if (want === "stop") {
      st.mode = "stop";
      return;
    }
    st.mode = "list";
  },
  on_exit() {},
  on_resume(os) {
    if (os.alarm && os.alarm.fired) st.mode = "done";
    else if (os.alarm && !os.alarm.fired && st.mode === "list") st.mode = "count";
  },
  on_input(os, ev) {
    if (st.mode === "done") {
      if (press(ev, BTN_OK) || press(ev, BTN_BACK)) {
        os_alarm_clear();
        st.mode = "list";
      }
      return;
    }
    if (st.mode === "stop") return on_stop(os, ev);
    if (st.mode === "count") return on_count(os, ev);
    if (st.mode === "dice") return on_dice(os, ev);
    const menu = { items: LIST, sel: st.sel, top: st.top };
    const dir = nav_delta(ev);
    if (dir) {
      menu_move(menu, dir, 3);
      st.sel = menu.sel;
      st.top = menu.top;
    }
    if (press(ev, BTN_OK)) {
      const id = LIST[st.sel].id;
      if (id === "panel") os_launch("panel");
      else st.mode = id;
    }
    if (press(ev, BTN_BACK)) os_pop();
  },
  on_tick(os, dt) {
    if (st.mode === "stop" && st.run) st.acc += dt;
    if (st.mode === "dice" && st.rolling) {
      st.acc += dt;
      if (st.acc >= 70) {
        st.acc = 0;
        st.rolls++;
        st.face = 1 + rand_int(6);
      }
      if (st.rolls >= 7) st.rolling = 0;
    }
    if (st.mode === "count" && os.alarm && os.alarm.fired) st.mode = "done";
  },
  on_draw(os, d) {
    if (st.mode === "stop") return draw_stop(os, d);
    if (st.mode === "count") return draw_count(os, d);
    if (st.mode === "dice") return draw_dice(os, d);
    if (st.mode === "done") return draw_done(os, d);
    ui_header(d, os, "Narzędzia");
    const menu = { items: LIST, sel: st.sel, top: st.top };
    menu_draw(d, menu, 0, 12, 128, 40, 13);
    ui_footer(d, "▲▼ wybór   ● wejdź");
    ui_set(os, ["wyżej", "niżej", "wejdź", "wróć"], -1);
  },
};

function draw_stop(os, d) {
  ui_header(d, os, "Stoper");
  big(d, 22, fmt_watch(st.acc));
  ui_footer(d, st.run ? "● stop   ◄ lista" : "● start   ▲ zeruj");
  ui_set(os, [st.run ? "" : "zeruj", "", st.run ? "stop" : "start", "lista"], -1);
}

function draw_count(os, d) {
  ui_header(d, os, "Minutnik");
  const running = os.alarm && !os.alarm.fired;
  if (!running) {
    display_text_center(d, 22, PRESETS[st.preset].label, 1);
    display_text_center(d, 36, "▲▼ czas   ● start", 1);
    ui_footer(d, "działa też po wyjściu");
    ui_set(os, ["krócej", "dłużej", "start", "lista"], -1);
    return;
  }
  big(d, 20, fmt_left(os_alarm_left()));
  ui_footer(d, "● anuluj   ◄ wyjdź");
  ui_set(os, ["", "", "anuluj", "zostaw"], -1);
}

function draw_dice(os, d) {
  ui_header(d, os, "Kostka");
  draw_face(d, st.face);
  ui_footer(d, st.rolling ? "..." : "● rzuć   ◄ lista");
  ui_set(os, ["", "", st.rolling ? "" : "rzuć", st.rolling ? "" : "lista"], -1);
}

function draw_done(os, d) {
  ui_header(d, os, "Minutnik");
  display_text_center(d, 24, "Koniec.", 1);
  display_text_center(d, 36, "Czas minął.", 1);
  ui_footer(d, "● OK");
  ui_set(os, ["", "", "OK", "OK"], -1);
}

function draw_face(d, face) {
  const x = 48;
  const y = 14;
  display_rect(d, x, y, 32, 32, 1);
  const map = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
  };
  const pts = map[face] || map[1];
  for (let i = 0; i < pts.length; i++) {
    display_fill_rect(d, x + 6 + pts[i][0] * 8, y + 6 + pts[i][1] * 8, 4, 4, 1);
  }
}

export function tools_state() {
  return st;
}
