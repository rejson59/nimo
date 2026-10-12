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

let scale = 4;
let frames = 0;
let fpsStamp = performance.now();
let fps = 0;

function pickScale() {
  const stage = document.querySelector(".stage");
  const availW = (stage ? stage.clientWidth : window.innerWidth) - 8;
  const availH = window.innerHeight - (window.innerWidth < 960 ? 210 : 36);
  const extraW = 250;
  const extraH = 150;
  let s = 6;
  while (s > 2 && (128 * s + extraW > availW || 64 * s + extraH > availH)) s--;
  return s;
}

function applyScale() {
  scale = pickScale();
  const screenH = 64 * scale;
  const colH = screenH + 20;
  const gap = scale >= 5 ? 10 : 8;
  const btn = Math.max(40, Math.min(72, Math.floor((colH - 3 * gap) / 4)));
  const root = document.documentElement;
  root.style.setProperty("--screen-w", 128 * scale + "px");
  root.style.setProperty("--screen-h", screenH + "px");
  root.style.setProperty("--btn", btn + "px");
  root.style.setProperty("--btn-gap", gap + "px");
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
  present(canvas, os.display, os.settings, scale);
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
