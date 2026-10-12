/** Ekran „O systemie”. Statyczny, zamykany OK albo wstecz. */

import { BTN_BACK, BTN_OK, NIMO_VERSION } from "../nimo_config.js";
import { display_text } from "../nimo_display.js";
import { press } from "../nimo_input.js";
import { os_pop } from "../nimo_os.js";
import { ui_header, ui_set } from "../nimo_ui.js";

const LINES = [
  "nimo os " + NIMO_VERSION,
  "0.96 cala 128x64",
  "SSD1306/1315 0x3C",
  "szkło białe/nieb.",
  "3.3 V, 4 piny",
  "panel do 100 Hz",
];

export const app_about = {
  id: "about",
  on_enter() {},
  on_exit() {},
  on_input(os, ev) {
    if (press(ev, BTN_OK) || press(ev, BTN_BACK)) os_pop();
  },
  on_tick() {},
  on_draw(os, d) {
    ui_header(d, os, "System");
    for (let i = 0; i < LINES.length; i++) {
      display_text(d, 2, 12 + i * 8, LINES[i], 1);
    }
    ui_set(os, ["", "", "zamknij", "zamknij"], -1);
  },
};
