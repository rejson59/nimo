/**
 * Uśpienie. Ekran zgaszony, jeden piksel mruga — widać, że to nie awaria.
 * Dowolny przycisk budzi. Na płytce: wyłączenie panelu OLED + uśpienie ESP32.
 */

import { EV_PRESS } from "../nimo_config.js";
import { display_pixel } from "../nimo_display.js";
import { os_pop } from "../nimo_os.js";
import { ui_set } from "../nimo_ui.js";

export const app_sleep = {
  id: "sleep",
  on_enter() {},
  on_exit() {},
  on_input(os, ev) {
    if (ev.type === EV_PRESS) os_pop();
  },
  on_tick() {},
  on_draw(os, d) {
    if (Math.floor(os.now / 700) % 2 === 0) display_pixel(d, 63, 32, 1);
    ui_set(os, ["budzi", "budzi", "budzi", "budzi"], -1);
  },
};
