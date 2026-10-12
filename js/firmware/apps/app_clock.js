/**
 * Zegar: czas, stoper i minutnik w jednym miejscu.
 * Minutnik zostaje w os.alarm, więc liczy się też po wyjściu.
 */

import { BTN_BACK, BTN_OK, BTN_UP } from "../nimo_config.js";
import { display_fill_rect, display_text_center, display_text_x2 } from "../nimo_display.js";
import { nav_delta, press } from "../nimo_input.js";
import { os_alarm_clear, os_alarm_left, os_alarm_set, os_pop } from "../nimo_os.js";
import { ui_footer, ui_header, ui_set } from "../nimo_ui.js";

const PRESETS = [
  { label: "15 s", ms: 15000 },
  { label: "30 s", ms: 30000 },
  { label: "1 min", ms: 60000 },
  { label: "3 min", ms: 180000 },
  { label: "5 min", ms: 300000 },
  { label: "25 min", ms: 1500000 },
];

const st = {
  mode: "time",
  run: 0,
  acc: 0,
  preset: 0,
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

function enter_mode(os) {
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
  st.mode = "time";
}

function on_time(os, ev) {
  if (press(ev, BTN_UP)) st.mode = "count";
  if (nav_delta(ev) > 0) st.mode = "stop";
  if (press(ev, BTN_BACK)) os_pop();
  void os;
}

function on_stop(os, ev) {
  if (press(ev, BTN_OK)) st.run = st.run ? 0 : 1;
  if (press(ev, BTN_UP) && !st.run) st.acc = 0;
  if (press(ev, BTN_BACK)) {
    st.run = 0;
    st.mode = "time";
  }
  void os;
}

function on_count(os, ev) {
  const running = os.alarm && !os.alarm.fired;
  if (!running) {
    const dir = nav_delta(ev);
    if (dir) st.preset = (st.preset + (dir > 0 ? 1 : -1) + PRESETS.length) % PRESETS.length;
    if (press(ev, BTN_OK)) os_alarm_set(PRESETS[st.preset].ms, "Minutnik", "koniec");
    if (press(ev, BTN_BACK)) st.mode = "time";
    return;
  }
  if (press(ev, BTN_OK)) os_alarm_clear();
  if (press(ev, BTN_BACK)) os_pop();
}

function draw_time(os, d) {
  const hm = pad2(os.hour) + ":" + pad2(os.minute);
  const w = Array.from(hm).length * 12;
  display_text_x2(d, Math.max(0, Math.floor((128 - w) / 2)), 14, hm, 1);
  display_text_center(d, 36, pad2(os.second), 1);
  const sec = Math.max(0, Math.min(59, os.second | 0));
  const bw = Math.floor((sec / 59) * 80);
  display_fill_rect(d, 24, 48, 80, 1, 1);
  if (bw) display_fill_rect(d, 24, 47, bw, 3, 1);
  ui_footer(d, "▲ minutnik ▼ stoper");
  ui_set(os, ["minutnik", "stoper", "", "wróć"], -1);
}

function draw_stop(os, d) {
  ui_header(d, os, "Stoper");
  big(d, 22, fmt_watch(st.acc));
  ui_footer(d, st.run ? "● stop   ◄ zegar" : "● start   ▲ zeruj");
  ui_set(os, [st.run ? "" : "zeruj", "", st.run ? "stop" : "start", "zegar"], -1);
}

function draw_count(os, d) {
  ui_header(d, os, "Minutnik");
  const running = os.alarm && !os.alarm.fired;
  if (!running) {
    display_text_center(d, 22, PRESETS[st.preset].label, 1);
    display_text_center(d, 36, "▲▼ czas   ● start", 1);
    ui_footer(d, "działa też po wyjściu");
    ui_set(os, ["krócej", "dłużej", "start", "zegar"], -1);
    return;
  }
  big(d, 20, fmt_left(os_alarm_left()));
  ui_footer(d, "● anuluj   ◄ wyjdź");
  ui_set(os, ["", "", "anuluj", "zostaw"], -1);
}

function draw_done(os, d) {
  ui_header(d, os, "Minutnik");
  display_text_center(d, 24, "Koniec.", 1);
  display_text_center(d, 36, "Czas minął.", 1);
  ui_footer(d, "● OK");
  ui_set(os, ["", "", "OK", "OK"], -1);
}

export const app_clock = {
  id: "clock",
  on_enter(os) {
    enter_mode(os);
  },
  on_exit() {},
  on_resume(os) {
    if (os.alarm && os.alarm.fired) st.mode = "done";
    else if (os.alarm && !os.alarm.fired && st.mode === "time") st.mode = "count";
  },
  on_input(os, ev) {
    if (st.mode === "done") {
      if (press(ev, BTN_OK) || press(ev, BTN_BACK)) {
        os_alarm_clear();
        st.mode = "time";
      }
      return;
    }
    if (st.mode === "stop") return on_stop(os, ev);
    if (st.mode === "count") return on_count(os, ev);
    return on_time(os, ev);
  },
  on_tick(os, dt) {
    if (st.mode === "stop" && st.run) st.acc += dt;
    if (os.alarm && os.alarm.fired && (st.mode === "count" || st.mode === "time")) st.mode = "done";
  },
  on_draw(os, d) {
    if (st.mode === "stop") return draw_stop(os, d);
    if (st.mode === "count") return draw_count(os, d);
    if (st.mode === "done") return draw_done(os, d);
    draw_time(os, d);
  },
};
