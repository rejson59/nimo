/**
 * Jądro systemu. Stos ekranów, klatka, zdarzenia.
 *
 * Pętla na ESP32:
 *   nimo_input_scan(millis());
 *   nimo_os_frame(millis());
 *   nimo_display_flush();
 *
 * Platforma (przeglądarka albo Arduino) dostarcza:
 *   storage_get / storage_set, beep, reboot, set_contrast, set_pixel_color
 * Zegar wpisuje w os.hour / os.minute przed klatką.
 */

import { EV_NAME, EV_RELEASE, BTN_NAME, BEEP_OK } from "./nimo_config.js";
import { chat_seed, normalize_settings, pad_load, pad_seed } from "./nimo_data.js";
import { display_clear, display_create } from "./nimo_display.js";

export const os = {
  platform: null,
  stack: [],
  settings: null,
  chat: null,
  display: null,
  hour: 12,
  minute: 0,
  second: 0,
  now: 0,
  last: 0,
  uptime_ms: 0,
  event_button: -1,
  mute_button: -1,
  log: [],
  ui: empty_ui(),
  open: null,
  pad: null,
  alarm: null,
};

function empty_ui() {
  return {
    hints: ["", "", "", ""],
    subs: ["", "", "", ""],
    highlight: -1,
    text_entry: false,
    last: "—",
    app: "",
    stack: [],
  };
}

export function os_init(platform) {
  os.platform = platform;
  os.stack = [];
  os.settings = normalize_settings(platform.storage_get("settings", null));
  os.chat = platform.storage_get("chat", null) || chat_seed();
  os.display = display_create();
  os.hour = 12;
  os.minute = 0;
  os.now = 0;
  os.last = 0;
  os.uptime_ms = 0;
  os.event_button = -1;
  os.mute_button = -1;
  os.log = [];
  os.ui = empty_ui();
  os.intent = null;
  os.pad = pad_load(platform.storage_get("pad", null));
  os.alarm = null;
}

export function os_top() {
  return os.stack.length ? os.stack[os.stack.length - 1] : null;
}

export function os_log(msg) {
  os.log.push(String(msg));
  if (os.log.length > 14) os.log.shift();
}

export function os_persist() {
  if (!os.platform) return;
  os.platform.storage_set("settings", os.settings);
  os.platform.storage_set("chat", os.chat);
  os.platform.storage_set("pad", os.pad || []);
}

export function os_factory_reset() {
  os.settings = normalize_settings(null);
  os.chat = chat_seed();
  os.pad = pad_seed();
  os.alarm = null;
  os_persist();
  os_log("factory reset");
}

function note_transition() {
  if (os.event_button >= 0) os.mute_button = os.event_button;
}

export function os_push(app) {
  os.stack.push(app);
  note_transition();
  os_log("enter " + app.id);
  if (app.on_enter) app.on_enter(os);
}

export function os_replace(app) {
  const cur = os.stack.pop();
  if (cur && cur.on_exit) cur.on_exit(os);
  os.stack.push(app);
  note_transition();
  os_log("enter " + app.id);
  if (app.on_enter) app.on_enter(os);
}

export function os_pop() {
  if (os.stack.length <= 1) return null;
  const cur = os.stack.pop();
  if (cur && cur.on_exit) cur.on_exit(os);
  note_transition();
  const top = os_top();
  os_log("back " + (top ? top.id : "-"));
  if (top && top.on_resume) top.on_resume(os);
  return cur;
}

/** Aplikacje wołają to zamiast importować się nawzajem. Rejestr ustawia nimo_apps.js. */
export function os_alarm_set(delay_ms, title, body) {
  os.alarm = {
    at: os.uptime_ms + Math.max(0, delay_ms | 0),
    title: title || "Minutnik",
    body: body || "koniec",
    fired: 0,
  };
}

export function os_alarm_clear() {
  os.alarm = null;
}

export function os_alarm_left() {
  if (!os.alarm || os.alarm.fired) return 0;
  return Math.max(0, os.alarm.at - os.uptime_ms);
}

export function os_launch(id, how = "push") {
  if (typeof os.open === "function") os.open(id, how);
}

export function os_on_event(ev) {
  if (ev.now) os.now = ev.now;
  if (os.mute_button === ev.button && ev.button >= 0) {
    if (ev.type === EV_RELEASE) os.mute_button = -1;
    return;
  }
  if (ev.button >= 0) os.event_button = ev.button;
  os.ui.last = ev.type === 6
    ? "char " + (ev.ch || "")
    : (EV_NAME[ev.type] || "?") + " " + (BTN_NAME[ev.button] || "");
  const app = os_top();
  if (app && app.on_input) app.on_input(os, ev);
}

export function os_frame(now) {
  if (!os.last) os.last = now;
  let dt = now - os.last;
  if (dt < 0 || dt > 250) dt = 16;
  os.last = now;
  os.now = now;
  os.uptime_ms += dt;
  if (os.alarm && !os.alarm.fired && os.uptime_ms >= os.alarm.at) {
    os.alarm.fired = 1;
    if (os.platform && os.platform.beep) os.platform.beep(BEEP_OK);
    os_log("alarm");
  }
  const app = os_top();
  if (app && app.on_tick) app.on_tick(os, dt);
  display_clear(os.display);
  if (app && app.on_draw) app.on_draw(os, os.display);
  os.ui.app = app ? app.id : "";
  os.ui.stack = os.stack.map((a) => a.id);
}

export function os_clear_stack() {
  while (os.stack.length) {
    const cur = os.stack.pop();
    if (cur && cur.on_exit) cur.on_exit(os);
  }
  os.event_button = -1;
  os.mute_button = -1;
}
