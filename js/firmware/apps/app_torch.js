/**
 * Latarka z OLED: pełna biel albo ramka, żeby nie razić w ciemności.
 * Na module to ten sam bufor, tylko jaśniejszy kontrast.
 */

import { BTN_BACK, BTN_OK } from "../nimo_config.js";
import { display_fill_rect, display_rect, display_text_center } from "../nimo_display.js";
import { press } from "../nimo_input.js";
import { os_pop } from "../nimo_os.js";
import { ui_set } from "../nimo_ui.js";

const st = { dim: 0 };

export const app_torch = {
  id: "torch",
  on_enter() {
    st.dim = 0;
  },
  on_exit() {},
  on_resume() {},
  on_input(os, ev) {
    if (press(ev, BTN_OK)) st.dim = st.dim ? 0 : 1;
    if (press(ev, BTN_BACK)) os_pop();
    void os;
  },
  on_tick() {},
  on_draw(os, d) {
    if (!st.dim) display_fill_rect(d, 0, 0, 128, 64, 1);
    else display_rect(d, 2, 2, 124, 60, 1);
    const ink = st.dim ? 1 : 0;
    display_text_center(d, 28, st.dim ? "słabiej" : "pełna", ink);
    display_text_center(d, 50, "● zmień   ◄ zgaś", ink);
    ui_set(os, ["", "", st.dim ? "jaśniej" : "słabiej", "zgaś"], -1);
  },
};
