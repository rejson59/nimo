/**
 * Czas reakcji. Czekasz na błysk i wciskasz OK.
 * Za wcześnie = pudło. Rekord (mniej ms) zostaje w NVS.
 */

import { BTN_BACK, BTN_OK, BEEP_ERR, BEEP_OK } from "../nimo_config.js";
import { display_fill_rect, display_text_center, display_text_x2 } from "../nimo_display.js";
import { press } from "../nimo_input.js";
import { rand_int, rand_seed } from "../nimo_rand.js";
import { os_persist, os_pop } from "../nimo_os.js";
import { ui_footer, ui_header, ui_set } from "../nimo_ui.js";

const st = {
  mode: "intro",
  goAt: 0,
  until: 0,
  ms: 0,
};

function big(d, y, str) {
  const w = Array.from(str).length * 12;
  display_text_x2(d, Math.max(0, Math.floor((128 - w) / 2)), y, str, 1);
}

function arm(os) {
  rand_seed((os.now + 91) >>> 0);
  st.until = os.now + 700 + rand_int(1600);
  st.mode = "wait";
}

export const app_react = {
  id: "react",
  on_enter() {
    st.mode = "intro";
    st.ms = 0;
  },
  on_exit() {},
  on_resume() {},
  on_input(os, ev) {
    if (press(ev, BTN_BACK)) {
      os_pop();
      return;
    }
    if (!press(ev, BTN_OK)) return;
    if (st.mode === "intro" || st.mode === "early" || st.mode === "result") {
      arm(os);
      return;
    }
    if (st.mode === "wait") {
      st.mode = "early";
      os.platform.beep(BEEP_ERR);
      return;
    }
    if (st.mode === "go") {
      st.ms = Math.max(1, os.now - st.goAt);
      st.mode = "result";
      if (!os.settings.react_best || st.ms < os.settings.react_best) {
        os.settings.react_best = st.ms;
        os_persist();
      }
      os.platform.beep(BEEP_OK);
    }
  },
  on_tick(os) {
    if (st.mode === "wait" && os.now >= st.until) {
      st.mode = "go";
      st.goAt = os.now;
    }
  },
  on_draw(os, d) {
    ui_header(d, os, "Reakcja");
    if (st.mode === "intro") {
      display_text_center(d, 24, "Czekaj na błysk.", 1);
      display_text_center(d, 36, "Potem ●", 1);
      ui_footer(d, "● start");
      ui_set(os, ["", "", "start", "wyjdź"], -1);
      return;
    }
    if (st.mode === "wait") {
      display_text_center(d, 28, "czekaj", 1);
      ui_set(os, ["", "", "nie teraz", "wyjdź"], -1);
      return;
    }
    if (st.mode === "go") {
      display_fill_rect(d, 0, 10, 128, 44, 1);
      display_text_center(d, 26, "TERAZ", 0);
      ui_set(os, ["", "", "teraz", "wyjdź"], 2);
      return;
    }
    if (st.mode === "early") {
      display_text_center(d, 24, "Za wcześnie.", 1);
      ui_footer(d, "● jeszcze raz");
      ui_set(os, ["", "", "jeszcze", "wyjdź"], -1);
      return;
    }
    big(d, 16, String(st.ms));
    const best = os.settings.react_best | 0;
    display_text_center(d, 40, best ? "rekord " + best : "ms", 1);
    ui_footer(d, "● jeszcze raz");
    ui_set(os, ["", "", "jeszcze", "wyjdź"], -1);
  },
};

export function react_state() {
  return st;
}
