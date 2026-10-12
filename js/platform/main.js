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

/**
 * CSS `mm` na telefonie to fikcja 96 px/cal. iOS liczymy jako 163 CSS px/cal
 * (także iPad udający Maca), Android jako 160. Desktop: zmierzony mm.
 * Pinch-zoom korygujemy tylko na ścieżce mobilnej.
 */
function glassCssPx() {
  const ua = navigator.userAgent || "";
  const touch = navigator.maxTouchPoints > 0;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && touch);
  const android = /Android/i.test(ua);
  const mobile = ios || android;
  const pxPerMm = ios ? 163 / 25.4 : android ? 160 / 25.4 : cssPxPerMm();
  const vv = window.visualViewport;
  const zoom = mobile && vv && vv.scale > 0 ? vv.scale : 1;
  return {
    w: (GLASS_W_MM * pxPerMm) / zoom,
    h: (GLASS_H_MM * pxPerMm) / zoom,
  };
}

function backingFor(cssW) {
  const dpr = window.devicePixelRatio || 1;
  let k = Math.ceil((cssW * dpr) / 128 - 1e-6);
  if (k < 1) k = 1;
  if (k > 4) k = 4;
  return k;
}

function applyScale() {
  glass = glassCssPx();
  scale = backingFor(glass.w);
  const root = document.documentElement;
  root.style.setProperty("--screen-w", glass.w.toFixed(2) + "px");
  root.style.setProperty("--screen-h", glass.h.toFixed(2) + "px");
  root.style.setProperty("--btn", "44px");
  root.style.setProperty("--btn-gap", "8px");
  const read = document.getElementById("size-readout");
  if (read) {
    read.textContent = "0.96\" · " + GLASS_W_MM.toFixed(1) + " × " + GLASS_H_MM.toFixed(1)
      + " mm · " + Math.round(glass.w) + " × " + Math.round(glass.h) + " px";
  }
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
