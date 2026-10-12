/**
 * Pisk piezo. Fala prostokątna, krótkie czasy — tak brzmi buzzer na ESP32.
 * AudioContext startuje po pierwszym geście (polityka przeglądarki).
 */

import {
  BEEP_BACK,
  BEEP_CLICK,
  BEEP_DIE,
  BEEP_EAT,
  BEEP_ERR,
  BEEP_M0,
  BEEP_M1,
  BEEP_M2,
  BEEP_M3,
  BEEP_OK,
} from "../firmware/nimo_config.js";

let ctx = null;
let enabled = true;

export function audio_set_enabled(on) {
  enabled = !!on;
}

function context() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, ms, vol, when, type = "square") {
  const ac = context();
  if (!ac) return;
  const t0 = ac.currentTime + (when || 0);
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0008, t0 + ms / 1000);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.02);
}

const CLICK = {
  0: 880,
  1: 740,
  2: 1180,
  3: 520,
};

export function audio_click(button) {
  if (!enabled) return;
  tone(CLICK[button] || 800, 12, 0.035);
}

export function audio_long() {
  if (!enabled) return;
  tone(360, 28, 0.04);
}

export function audio_beep(id) {
  if (!enabled) return;
  if (id === BEEP_CLICK) return tone(900, 12, 0.035);
  if (id === BEEP_BACK) return tone(520, 16, 0.04);
  if (id === BEEP_ERR) return tone(150, 80, 0.05);
  if (id === BEEP_EAT) return tone(1560, 30, 0.045);
  if (id === BEEP_OK) return tone(1240, 22, 0.04);
  if (id === BEEP_DIE) {
    tone(240, 70, 0.05);
    tone(120, 120, 0.05, 0.08);
    return;
  }
  if (id === BEEP_M0) return tone(523, 130, 0.045);
  if (id === BEEP_M1) return tone(659, 130, 0.045);
  if (id === BEEP_M2) return tone(784, 130, 0.045);
  if (id === BEEP_M3) return tone(988, 130, 0.045);
}

export function audio_unlock() {
  context();
}
