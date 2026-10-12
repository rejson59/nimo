/**
 * Ekran startowy. Dowolny przycisk pomija.
 * Po nim: samouczek (pierwszy raz) albo menu.
 */

import { NIMO_VERSION } from "../nimo_config.js";
import { display_fill_rect, display_rect, display_text_center, display_text_x2 } from "../nimo_display.js";
import { EV_PRESS } from "../nimo_config.js";
import { os_launch } from "../nimo_os.js";
import { ui_set } from "../nimo_ui.js";

const st = { t: 0, done: false };

function finish(os) {
  if (st.done) return;
  st.done = true;
  os_launch(os.settings.tutorial_done ? "home" : "tutorial", "replace");
}

export const app_boot = {
  id: "boot",
  on_enter() {
    st.t = 0;
    st.done = false;
  },
  on_exit() {},
  on_input(os, ev) {
    if (ev.type === EV_PRESS) finish(os);
  },
  on_tick(os, dt) {
    st.t += dt;
    if (st.t > 1680) finish(os);
  },
  on_draw(os, d) {
    const x = Math.floor((128 - 4 * 12) / 2);
    display_text_x2(d, x, 14, "nimo", 1);
    display_text_center(d, 34, "os " + NIMO_VERSION, 1);
    const w = 78;
    const bx = Math.floor((128 - w) / 2);
    display_rect(d, bx, 48, w, 7, 1);
    const p = Math.max(0, Math.min(1, (st.t - 180) / 1300));
    const inner = Math.floor((w - 4) * p);
    if (inner > 0) display_fill_rect(d, bx + 2, 50, inner, 3, 1);
    display_text_center(d, 57, "● pomiń", 1);
    ui_set(os, ["pomiń", "pomiń", "pomiń", "pomiń"], 2);
  },
};
