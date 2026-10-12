/**
 * Powłoka symulatora. Tylko ten katalog zna przeglądarkę.
 * Firmware (js/firmware) nie importuje stąd nic.
 */

import { audio_beep, audio_click, audio_long, audio_set_enabled, audio_unlock } from "./audio_web.js";
import { snapshot_blob, present } from "./oled_view.js";
import {
  input_attach_button,
  input_attach_keys,
  input_bind,
  input_pump,
  input_view,
} from "./input_web.js";
import { storage_clear, storage_get, storage_set } from "./storage_web.js";
import { EV_LONG, EV_PRESS } from "../firmware/nimo_config.js";
import { launch } from "../firmware/nimo_apps.js";
import { tutorial_ask_skip } from "../firmware/apps/app_tutorial.js";
import { os, os_clear_stack, os_factory_reset, os_frame, os_init, os_on_event, os_top } from "../firmware/nimo_os.js";

const canvas = document.getElementById("oled");
const led = document.getElementById("led");
const pill = document.getElementById("app-pill");
const typeNote = document.getElementById("type-note");
const probes = [...document.querySelectorAll(".probe")];
const buttons = [...document.querySelectorAll(".hw")];

const platform = {
  storage_get,
  storage_set,
  beep(id) {
    audio_set_enabled(os.settings ? os.settings.sound : 1);
    audio_beep(id);
  },
  reboot() {
    os_clear_stack();
    launch("boot");
  },
  set_contrast() {},
  set_pixel_color() {},
};

os_init(platform);
launch("boot");

input_bind((ev) => {
  audio_set_enabled(os.settings.sound);
  if (ev.type === EV_PRESS) audio_click(ev.button);
  if (ev.type === EV_LONG) audio_long();
  os_on_event(ev);
});

buttons.forEach((el) => input_attach_button(el, Number(el.dataset.btn)));
input_attach_keys(() => (os.ui && os.ui.text_entry) || false);

/** Aktywny obszar 0.96" 128×64, nie przekątna z ramką modułu. */
const GLASS_W_MM = 21.744;
const GLASS_H_MM = 10.864;

let scale = 1;
let glass = { w: 82.23, h: 41.07 };
let frames = 0;
let fpsStamp = performance.now();
let fps = 0;

function cssPxPerMm() {
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;left:-1200px;top:0;width:100mm;height:1px;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().width / 100;
  probe.remove();
  return px > 0.5 ? px : 96 / 25.4;
}

function isPhone() {
  const ua = navigator.userAgent || "";
  const w = window.innerWidth || 1200;
  const h = window.innerHeight || 800;
  if (w >= 700 || Math.min(w, h) >= 540) return false;
  return /iPhone|iPod|Android|Mobile/i.test(ua) && !/Windows NT/i.test(ua);
}

/**
 * Na telefonie szkło ma prawdziwe 0.96". CSS `mm` tam kłamie (96 px/cal),
 * więc iOS liczymy jako 163, Android jako 160. Na komputerze ekran jest
 * powiększony całkowitoliczbowo, bo 22×11 mm ledwo widać.
 */
function glassCssPx() {
  const phone = isPhone();
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 0);
  const pxPerMm = ios ? 163 / 25.4 : phone ? 160 / 25.4 : cssPxPerMm();
  const vv = window.visualViewport;
  const zoom = phone && vv && vv.scale > 0 ? vv.scale : 1;
  const w = (GLASS_W_MM * pxPerMm) / zoom;
  const h = (GLASS_H_MM * pxPerMm) / zoom;
  if (phone) return { w, h, zoom: 1, life: true };
  const wdw = window.innerWidth || 1200;
  const side = 200;
  const availW = Math.max(200, wdw - side - 24);
  const availH = Math.max(140, window.innerHeight - 96);
  let s = Math.floor(Math.min(availW / 128, availH / 64, 8));
  if (s < 2) s = 2;
  if (s < 4 && availW >= 520) s = 4;
  if (s > 8) s = 8;
  return { w: 128 * s, h: 64 * s, zoom: s, life: false };
}

function backingFor(cssW) {
  const dpr = window.devicePixelRatio || 1;
  let k = Math.round((cssW * dpr) / 128);
  if (k < 1) k = 1;
  if (k > 8) k = 8;
  return k;
}

function applyScale() {
  glass = glassCssPx();
  scale = backingFor(glass.w);
  const root = document.documentElement;
  const btn = glass.life ? 44 : Math.max(48, Math.min(64, Math.round((glass.h - 24) / 4)));
  const wpx = glass.w.toFixed(2) + "px";
  const hpx = glass.h.toFixed(2) + "px";
  root.style.setProperty("--screen-w", wpx);
  root.style.setProperty("--screen-h", hpx);
  root.style.setProperty("--oled-w", wpx);
  root.style.setProperty("--oled-h", hpx);
  root.style.setProperty("--oled-btn", btn + "px");
  root.style.setProperty("--btn", btn + "px");
  root.style.setProperty("--btn-gap", "8px");
  const read = document.getElementById("size-readout");
  if (read) {
    read.textContent = glass.life ? "0.96\"" : glass.zoom + "×";
  }
}

const SHELLS = [
  {
    bg: "#0e0f0c", ink: "#f3efe6", muted: "#a39c8e", faint: "#6f6a60",
    amber: "#e3a33a", dim: "rgba(227, 163, 58, 0.16)", spot: "rgba(227, 163, 58, 0.06)",
    plate: "#191b17", edge: "#34382f", well: "#050605", ring: "#3a3224",
    btn: "#23261f", btnInk: "#d9d3c8", btnEdge: "#2a2d28", kbd: "#22241f", kbdEdge: "#3a3d36",
    light: 0,
  },
  {
    bg: "#070a12", ink: "#e7f1fb", muted: "#8eabc4", faint: "#5d7388",
    amber: "#8ec8f0", dim: "rgba(142, 200, 240, 0.16)", spot: "rgba(80, 140, 200, 0.08)",
    plate: "#101722", edge: "#243246", well: "#03060c", ring: "#2a3c52",
    btn: "#15202c", btnInk: "#d5e6f4", btnEdge: "#2c4156", kbd: "#121a24", kbdEdge: "#314556",
    light: 0,
  },
  {
    bg: "#120e09", ink: "#f8ecd4", muted: "#c4aa84", faint: "#8a7358",
    amber: "#e3a33a", dim: "rgba(227, 163, 58, 0.18)", spot: "rgba(227, 163, 58, 0.1)",
    plate: "#1c1610", edge: "#3d3224", well: "#0a0704", ring: "#5a4630",
    btn: "#2a2118", btnInk: "#f0ddb8", btnEdge: "#4a3a28", kbd: "#241c14", kbdEdge: "#4a3c2c",
    light: 0,
  },
  {
    bg: "#0e100e", ink: "#e7f0ea", muted: "#9aab9e", faint: "#667268",
    amber: "#d6b15a", dim: "rgba(214, 177, 90, 0.16)", spot: "rgba(120, 170, 210, 0.07)",
    plate: "#151815", edge: "#2c342e", well: "#050705", ring: "#3a4038",
    btn: "#1c221e", btnInk: "#dce8df", btnEdge: "#343c36", kbd: "#171c18", kbdEdge: "#343c36",
    light: 0,
  },
  {
    bg: "#e7e1d4", ink: "#1c1914", muted: "#5e564c", faint: "#8a8174",
    amber: "#8a5a18", dim: "rgba(138, 90, 24, 0.14)", spot: "rgba(138, 90, 24, 0.08)",
    plate: "#f4efe6", edge: "#d4cbb8", well: "#f7f1e6", ring: "#c4b49a",
    btn: "#efe8dc", btnInk: "#2a241c", btnEdge: "#c9beaa", kbd: "#fffaf2", kbdEdge: "#c9beaa",
    light: 1,
  },
];

function applyShell(theme) {
  const s = SHELLS[theme | 0] || SHELLS[0];
  const root = document.documentElement;
  const set = (k, v) => root.style.setProperty(k, v);
  set("--bg", s.bg);
  set("--ink", s.ink);
  set("--muted", s.muted);
  set("--faint", s.faint);
  set("--amber", s.amber);
  set("--amber-dim", s.dim);
  set("--spot", s.spot);
  set("--plate", s.plate);
  set("--plate-edge", s.edge);
  set("--well", s.well);
  set("--well-ring", s.ring);
  set("--btn-face", s.btn);
  set("--btn-ink", s.btnInk);
  set("--btn-edge", s.btnEdge);
  set("--kbd-bg", s.kbd);
  set("--kbd-edge", s.kbdEdge);
  root.style.colorScheme = s.light ? "light" : "dark";
  if (canvas) canvas.style.background = s.light ? s.well : "#000";
}

function sync(now) {
  const view = input_view(now);
  const hints = os.ui.hints || ["", "", "", ""];
  const subs = os.ui.subs || ["", "", "", ""];
  buttons.forEach((el, i) => {
    const v = view[i];
    el.classList.toggle("is-down", v.down);
    el.classList.toggle("is-hot", os.ui.highlight === i);
    el.classList.toggle("is-hold", v.p > 0.03);
    el.style.setProperty("--p", String(Math.round(v.p * 100)));
    el.setAttribute("aria-label", hints[i] || el.dataset.fallback || "przycisk");
  });
  probes.forEach((el, i) => {
    el.classList.toggle("is-hot", os.ui.highlight === i);
    const t = el.querySelector(".t");
    const s = el.querySelector(".s");
    if (t) t.textContent = hints[i] || "—";
    if (s) {
      s.textContent = subs[i] || "";
      s.hidden = !subs[i];
    }
  });
  if (pill) pill.textContent = os.ui.app || "—";
  if (led) {
    led.classList.toggle("on", os.ui.app && os.ui.app !== "sleep");
    led.classList.toggle("asleep", os.ui.app === "sleep");
  }
  if (typeNote) typeNote.hidden = os.ui.text_entry !== "full";
  const stack = document.getElementById("pol-stack");
  const last = document.getElementById("pol-last");
  const up = document.getElementById("pol-up");
  const fp = document.getElementById("pol-fps");
  const log = document.getElementById("pol-log");
  if (stack) stack.textContent = (os.ui.stack || []).join(" → ") || "—";
  if (last) last.textContent = os.ui.last || "—";
  if (up) up.textContent = format_uptime(os.uptime_ms);
  if (fp) fp.textContent = fps + " fps";
  if (log) {
    log.replaceChildren();
    for (const line of os.log) {
      const li = document.createElement("li");
      li.textContent = line;
      log.appendChild(li);
    }
  }
  document.body.classList.toggle("is-sleep", os.ui.app === "sleep");
  applyShell(os.settings ? os.settings.theme : 0);
}

function format_uptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const p = (n) => String(n).padStart(2, "0");
  return p(h) + ":" + p(m % 60) + ":" + p(s % 60);
}

function frame(now) {
  if (fitted < 4) {
    applyScale();
    fitted++;
  }
  const clock = new Date();
  os.hour = clock.getHours();
  os.minute = clock.getMinutes();
  os.second = clock.getSeconds();
  input_pump(now);
  os_frame(now);
  present(canvas, os.display, os.settings, scale, glass);
  frames++;
  if (now - fpsStamp >= 500) {
    fps = Math.round((frames * 1000) / (now - fpsStamp));
    frames = 0;
    fpsStamp = now;
  }
  sync(now);
  requestAnimationFrame(frame);
}

applyScale();
window.addEventListener("resize", applyScale);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", applyScale);
  window.visualViewport.addEventListener("scroll", applyScale);
}
let fitted = 0;

document.getElementById("btn-tutorial")?.addEventListener("click", () => {
  audio_unlock();
  if (os_top()?.id === "tutorial") return;
  os.event_button = -1;
  launch("tutorial");
});

document.getElementById("btn-skip")?.addEventListener("click", () => {
  audio_unlock();
  os.event_button = -1;
  if (os_top()?.id === "tutorial") {
    tutorial_ask_skip();
    return;
  }
  os.intent = Object.assign({}, os.intent, { tutorial_warn: 1 });
  launch("tutorial");
});

document.getElementById("btn-shot")?.addEventListener("click", async () => {
  const blob = await snapshot_blob(os.display, os.settings);
  if (!blob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "nimo-oled.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
});

document.getElementById("btn-reset")?.addEventListener("click", () => {
  storage_clear();
  os_factory_reset();
  platform.reboot();
});

window.addEventListener("pointerdown", audio_unlock, { once: true });
window.addEventListener("keydown", audio_unlock, { once: true });

window.addEventListener("error", (event) => {
  if (pill) pill.textContent = "błąd JS";
  console.error(event.error || event.message);
});

requestAnimationFrame(frame);
