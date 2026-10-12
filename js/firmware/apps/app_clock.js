/**
 * Duży zegar. Czas wpisuje platforma w os.hour / minute / second.
 * OK otwiera stoper — to ten sam gest, co „sprawdź czas i zmierz”.
 */

import { BTN_BACK, BTN_OK } from "../nimo_config.js";
import { display_fill_rect, display_text_center, display_text_x2 } from "../nimo_display.js";
import { press } from "../nimo_input.js";
import { os_launch, os_pop } from "../nimo_os.js";
import { ui_set } from "../nimo_ui.js";

function pad2(n) {
  return String(n | 0).padStart(2, "0");
}

export const app_clock = {
  id: "clock",
  on_enter() {},
  on_exit() {},
  on_resume() {},
  on_input(os, ev) {
    if (press(ev, BTN_OK)) {
      os.intent = Object.assign({}, os.intent, { tool: "stop" });
      os_launch("tools");
    }
    if (press(ev, BTN_BACK)) os_pop();
  },
  on_tick() {},
  on_draw(os, d) {
    const hm = pad2(os.hour) + ":" + pad2(os.minute);
    const w = Array.from(hm).length * 12;
    display_text_x2(d, Math.max(0, Math.floor((128 - w) / 2)), 16, hm, 1);
    display_text_center(d, 40, pad2(os.second), 1);
    const sec = Math.max(0, Math.min(59, os.second | 0));
    const bw = Math.floor((sec / 59) * 80);
    display_fill_rect(d, 24, 52, 80, 1, 1);
    if (bw) display_fill_rect(d, 24, 51, bw, 3, 1);
    ui_set(os, ["", "", "stoper", "wróć"], -1);
  },
};
