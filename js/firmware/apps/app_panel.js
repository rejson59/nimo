/**
 * Laboratorium sterownika. Efekty idą obok RAM, tak jak na module.
 * ◄ gasi przewijanie, zanikanie i „cały panel”. Obrót zostaje w NVS.
 */

import { BTN_BACK, BTN_OK } from "../nimo_config.js";
import { nav_delta, press } from "../nimo_input.js";
import { os_persist, os_pop } from "../nimo_os.js";
import {
  panel_all_on,
  panel_fx,
  panel_gain,
  panel_reset,
  panel_scroll,
  panel_state,
} from "../nimo_panel.js";
import { menu_draw, menu_move, ui_footer, ui_header, ui_set } from "../nimo_ui.js";

const SCROLL_NAME = ["nie", "lewo", "prawo", "skos"];

const st = { sel: 0, top: 0 };

function items(os) {
  const p = panel_state();
  let fade = "nie";
  if (p.fx === 1) fade = panel_gain() === 0 ? "ciemno" : "tak";
  return [
    { id: "scroll", label: "Przewiń", value: SCROLL_NAME[p.scroll] || "nie" },
    { id: "fade", label: "Zanikanie", value: fade },
    { id: "blink", label: "Mruganie", value: p.fx === 2 ? "tak" : "nie" },
    { id: "all", label: "Cały panel", value: p.allOn ? "tak" : "nie" },
    { id: "flip", label: "Obrót", value: os.settings.flip ? "180" : "nie" },
  ];
}

export const app_panel = {
  id: "panel",
  on_enter() {
    st.sel = 0;
    st.top = 0;
    panel_reset();
  },
  on_exit() {
    panel_reset();
  },
  on_input(os, ev) {
    const list = items(os);
    const menu = { items: list, sel: st.sel, top: st.top };
    const dir = nav_delta(ev);
    if (dir) {
      menu_move(menu, dir, 3);
      st.sel = menu.sel;
      st.top = menu.top;
    }
    if (press(ev, BTN_OK)) {
      const id = list[st.sel].id;
      const p = panel_state();
      if (id === "scroll") panel_scroll((p.scroll + 1) % 4);
      else if (id === "fade") panel_fx(p.fx === 1 ? 0 : 1);
      else if (id === "blink") panel_fx(p.fx === 2 ? 0 : 2);
      else if (id === "all") panel_all_on(p.allOn ? 0 : 1);
      else if (id === "flip") {
        os.settings.flip = os.settings.flip ? 0 : 1;
        os_persist();
      }
    }
    if (press(ev, BTN_BACK)) os_pop();
  },
  on_tick() {},
  on_draw(os, d) {
    ui_header(d, os, "Sterownik");
    const menu = { items: items(os), sel: st.sel, top: st.top };
    menu_draw(d, menu, 0, 12, 128, 40, 13);
    ui_footer(d, "RAM stoi, to komenda");
    ui_set(os, ["wyżej", "niżej", "próbuj", "wróć"], -1);
  },
};
