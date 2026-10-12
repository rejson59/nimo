/**
 * Pamięć — cztery pola, cztery przyciski. Sekwencja rośnie co rundę.
 * Dobrze ćwiczy mapę przycisków, bo każde pole to jeden fizyczny klawisz.
 */

import { BTN_BACK, BTN_OK, BEEP_DIE, BEEP_M0, BEEP_OK, EV_PRESS } from "../nimo_config.js";
import { display_fill_round, display_round, display_text, text_width } from "../nimo_display.js";
import { press } from "../nimo_input.js";
import { rand_int, rand_seed } from "../nimo_rand.js";
import { os_persist, os_pop } from "../nimo_os.js";
import { dialog_draw, ui_header, ui_set } from "../nimo_ui.js";

const PADS = [
  { x: 4, y: 16, label: "▲" },
  { x: 66, y: 16, label: "▼" },
  { x: 4, y: 38, label: "●" },
  { x: 66, y: 38, label: "◄" },
];

const st = {
  mode: "intro",
  level: 1,
  seq: [],
  showIdx: 0,
  phase: "on",
  phaseT: 0,
  beeped: false,
  inputIdx: 0,
  lit: -1,
  litUntil: 0,
  failSel: 0,
};

function save_best(os, level) {
  if (level > os.settings.memory_best) {
    os.settings.memory_best = level;
    os_persist();
  }
}

function new_round(os) {
  st.seq = [];
  for (let i = 0; i < st.level; i++) st.seq.push(rand_int(4));
  st.showIdx = 0;
  st.phase = "on";
  st.phaseT = 0;
  st.beeped = false;
  st.inputIdx = 0;
  st.mode = "show";
  st.lit = -1;
}

function begin(os) {
  st.level = 1;
  st.failSel = 0;
  rand_seed((os.uptime_ms ^ 0x85ebca6b) >>> 0 || 3);
  new_round(os);
}

export const app_memory = {
  id: "memory",
  on_enter() {
    st.mode = "intro";
    st.level = 1;
    st.failSel = 0;
  },
  on_exit() {},
  on_input(os, ev) {
    if (st.mode === "intro") {
      if (press(ev, BTN_OK)) begin(os);
      if (press(ev, BTN_BACK)) os_pop();
      return;
    }
    if (st.mode === "fail") {
      if (ev.type === EV_PRESS && (ev.button === 0 || ev.button === 1)) st.failSel = st.failSel ? 0 : 1;
      if (press(ev, BTN_OK)) {
        if (st.failSel === 0) begin(os);
        else os_pop();
      }
      if (press(ev, BTN_BACK)) os_pop();
      return;
    }
    if (st.mode !== "input") return;
    if (ev.type !== EV_PRESS || ev.button < 0 || ev.button > 3) return;
    st.lit = ev.button;
    st.litUntil = os.now + 180;
    os.platform.beep(BEEP_M0 + ev.button);
    if (ev.button !== st.seq[st.inputIdx]) {
      st.mode = "fail";
      st.failSel = 0;
      os.platform.beep(BEEP_DIE);
      return;
    }
    st.inputIdx++;
    if (st.inputIdx >= st.seq.length) {
      save_best(os, st.level);
      st.level++;
      st.mode = "ok";
      st.phaseT = 0;
      os.platform.beep(BEEP_OK);
    }
  },
  on_tick(os, dt) {
    if (st.mode === "show") {
      if (st.phase === "on" && !st.beeped) {
        os.platform.beep(BEEP_M0 + st.seq[st.showIdx]);
        st.beeped = true;
      }
      st.phaseT += dt;
      const onMs = Math.max(150, 360 - st.level * 18);
      const offMs = 130;
      if (st.phase === "on" && st.phaseT >= onMs) {
        st.phase = "off";
        st.phaseT = 0;
      } else if (st.phase === "off" && st.phaseT >= offMs) {
        st.showIdx++;
        if (st.showIdx >= st.seq.length) {
          st.mode = "input";
          st.inputIdx = 0;
        } else {
          st.phase = "on";
          st.phaseT = 0;
          st.beeped = false;
        }
      }
    } else if (st.mode === "ok") {
      st.phaseT += dt;
      if (st.phaseT > 420) new_round(os);
    }
  },
  on_draw(os, d) {
    if (st.mode === "intro") {
      ui_header(d, os, "Pamięć");
      display_text(d, 2, 14, "4 pola = 4 przyciski", 1);
      display_text(d, 2, 24, "Powtórz sekwencję.", 1);
      display_text(d, 2, 36, "Rekord " + os.settings.memory_best, 1);
      display_text(d, 2, 57, "● start    ◄ wróć", 1);
      ui_set(os, ["góra", "dół", "start", "wróć"], 2);
      return;
    }
    const title = st.mode === "input" ? "Powtórz" : st.mode === "fail" ? "Pudło" : "Pamięć";
    ui_header(d, os, title, { plain: true });
    const lv = "poz " + st.level;
    display_text(d, 127 - text_width(lv), 0, lv, 1);
    let lit = -1;
    if (st.mode === "show" && st.phase === "on") lit = st.seq[st.showIdx];
    if (os.now < st.litUntil) lit = st.lit;
    for (let i = 0; i < 4; i++) {
      const p = PADS[i];
      const on = lit === i;
      if (on) display_fill_round(d, p.x, p.y, 58, 18, 1);
      else display_round(d, p.x, p.y, 58, 18, 1);
      const col = on ? 0 : 1;
      const lw = text_width(p.label);
      display_text(d, p.x + Math.floor((58 - lw) / 2), p.y + 5, p.label, col);
    }
    if (st.mode === "fail") {
      dialog_draw(d, "Koniec", ["Jeszcze raz", "Menu"], st.failSel);
      ui_set(os, ["wybór", "wybór", "zatwierdź", "menu"], -1);
    } else if (st.mode === "show") {
      ui_set(os, ["patrz", "patrz", "patrz", "patrz"], st.phase === "on" ? st.seq[st.showIdx] : -1);
    } else if (st.mode === "input") {
      ui_set(os, ["pole ▲", "pole ▼", "pole ●", "pole ◄"], -1);
    } else {
      ui_set(os, ["", "", "", ""], -1);
    }
  },
};

export function memory_state() {
  return st;
}
