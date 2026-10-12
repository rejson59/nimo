/**
 * Klawiatura i przyciski na obudowie → zdarzenia firmware.
 * Czas przytrzymania i powtarzania jest tu, nie w logice menu,
 * tak jak skaner GPIO w nimo_input.cpp.
 */

import {
  BTN_BACK,
  BTN_COUNT,
  BTN_OK,
  EV_CHAR,
  EV_LONG,
  EV_PRESS,
  EV_RELEASE,
  EV_REPEAT,
  EV_TAP,
  LONG_MS,
  REPEAT_DELAY_MS,
  REPEAT_FAST_AFTER,
  REPEAT_FAST_MS,
  REPEAT_MS,
} from "../firmware/nimo_config.js";

const held = [null, null, null, null];
let emit = () => {};

export function input_bind(fn) {
  emit = fn;
}

export function input_down(btn, now) {
  if (btn < 0 || btn >= BTN_COUNT) return;
  if (held[btn]) return;
  held[btn] = { t: now, last: now, repeats: 0, long: false };
  emit({ type: EV_PRESS, button: btn, now });
}

export function input_up(btn, now) {
  const h = held[btn];
  if (!h) return;
  held[btn] = null;
  emit({ type: EV_RELEASE, button: btn, now });
  if (!h.long) emit({ type: EV_TAP, button: btn, now });
}

export function input_char(ch, now) {
  emit({ type: EV_CHAR, button: -1, ch, now });
}

export function input_pump(now) {
  for (let b = 0; b < BTN_COUNT; b++) {
    const h = held[b];
    if (!h) continue;
    if (!h.long && now - h.t >= LONG_MS) {
      h.long = true;
      emit({ type: EV_LONG, button: b, now });
    }
    const wait = h.repeats >= REPEAT_FAST_AFTER ? REPEAT_FAST_MS : REPEAT_MS;
    if (now - h.t >= REPEAT_DELAY_MS && now - h.last >= wait) {
      h.last = now;
      h.repeats++;
      emit({ type: EV_REPEAT, button: b, now });
    }
  }
}

export function input_release_all(now) {
  for (let b = 0; b < BTN_COUNT; b++) input_up(b, now);
}

export function input_view(now) {
  const out = [];
  for (let b = 0; b < BTN_COUNT; b++) {
    const h = held[b];
    if (!h) out.push({ down: false, p: 0, long: false });
    else out.push({ down: true, p: Math.min(1, (now - h.t) / LONG_MS), long: h.long });
  }
  return out;
}

export function input_attach_keys(getMode) {
  const keyHeld = new Map();

  function buttonFor(e) {
    if (e.key === "ArrowUp") return 0;
    if (e.key === "ArrowDown") return 1;
    if (e.key === "Enter") return BTN_OK;
    if (e.key === "Escape" || e.key === "Backspace") return BTN_BACK;
    if (e.key === " " && getMode() !== "full") return BTN_OK;
    return -1;
  }

  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const mode = getMode();
    if (e.key === "Enter" && e.shiftKey && mode === "full") {
      e.preventDefault();
      emit({ type: EV_LONG, button: BTN_OK, now: performance.now() });
      return;
    }
    const btn = buttonFor(e);
    if (btn >= 0) {
      e.preventDefault();
      if (e.repeat || keyHeld.has(e.code)) return;
      keyHeld.set(e.code, btn);
      input_down(btn, performance.now());
      return;
    }
    if ((mode === "type" || mode === "full") && e.key.length === 1 && !e.repeat) {
      e.preventDefault();
      input_char(e.key, performance.now());
    } else if (mode === "full" && e.key.length === 1 && e.repeat) {
      e.preventDefault();
      input_char(e.key, performance.now());
    }
  });

  window.addEventListener("keyup", (e) => {
    if (!keyHeld.has(e.code)) return;
    const btn = keyHeld.get(e.code);
    keyHeld.delete(e.code);
    const still = [...keyHeld.values()].includes(btn);
    if (!still) input_up(btn, performance.now());
  });

  window.addEventListener("blur", () => input_release_all(performance.now()));
}

export function input_attach_button(el, btn) {
  const end = (e) => {
    e.preventDefault();
    input_up(btn, performance.now());
  };
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    input_down(btn, performance.now());
  });
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("contextmenu", (e) => e.preventDefault());
}
