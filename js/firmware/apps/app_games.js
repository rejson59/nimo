/** Lista gierek. Wartość po prawej to rekord z NVS. */

import { BTN_BACK, BTN_OK } from "../nimo_config.js";
import { nav_delta, press } from "../nimo_input.js";
import { os_launch, os_pop } from "../nimo_os.js";
import { menu_draw, menu_move, ui_footer, ui_header, ui_set } from "../nimo_ui.js";

const WIN = 3;
const st = { sel: 0, top: 0 };

function items(os) {
  return [
    { id: "snake", label: "Snake", value: os.settings.snake_best ? String(os.settings.snake_best) : "" },
    { id: "memory", label: "Pamięć", value: os.settings.memory_best ? String(os.settings.memory_best) : "" },
    { id: "react", label: "Reakcja", value: os.settings.react_best ? String(os.settings.react_best) : "" },
    { id: "kostka", label: "Kostka", value: "" },
  ];
}

export const app_games = {
  id: "games",
  on_enter() {},
  on_exit() {},
  on_input(os, ev) {
    const menu = { items: items(os), sel: st.sel, top: st.top };
    const dir = nav_delta(ev);
    if (dir) {
      menu_move(menu, dir, WIN);
      st.sel = menu.sel;
      st.top = menu.top;
    }
    if (press(ev, BTN_OK)) {
      const it = items(os)[st.sel];
      if (!it) return;
      if (it.id === "kostka") {
        os.intent = Object.assign({}, os.intent, { tool: "dice" });
        os_launch("tools");
        return;
      }
      os_launch(it.id);
    }
    if (press(ev, BTN_BACK)) os_pop();
  },
  on_tick() {},
  on_draw(os, d) {
    ui_header(d, os, "Gierki");
    const menu = { items: items(os), sel: st.sel, top: st.top };
    menu_draw(d, menu, 0, 12, 128, 40, 16);
    ui_footer(d, "▲▼ wybór   ● graj");
    ui_set(os, ["wyżej", "niżej", "graj", "wróć"], -1);
  },
};
