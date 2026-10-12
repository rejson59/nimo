/**
 * Menu główne: Czat, Gierki, Ustawienia.
 * Wstecz otwiera pytanie o uśpienie — nie wychodzi „donikąd”.
 */

import { BTN_BACK, BTN_OK } from "../nimo_config.js";
import { nav_delta, press } from "../nimo_input.js";
import { os_launch } from "../nimo_os.js";
import { dialog_draw, menu_draw, menu_move, ui_footer, ui_header, ui_set } from "../nimo_ui.js";

const MODE_MENU = 0;
const MODE_POWER = 1;
const WIN = 3;

const st = {
  mode: MODE_MENU,
  sel: 0,
  top: 0,
  psel: 0,
};

function items() {
  return [
    { id: "chat", label: "Czat" },
    { id: "games", label: "Gierki" },
    { id: "settings", label: "Ustawienia" },
  ];
}

export const app_home = {
  id: "home",
  on_enter() {
    st.mode = MODE_MENU;
    st.psel = 0;
  },
  on_resume() {
    st.mode = MODE_MENU;
    st.psel = 0;
  },
  on_exit() {},
  on_input(os, ev) {
    if (st.mode === MODE_POWER) {
      const dir = nav_delta(ev);
      if (dir) st.psel = st.psel ? 0 : 1;
      if (press(ev, BTN_OK)) {
        if (st.psel === 0) os_launch("sleep");
        else st.mode = MODE_MENU;
      }
      if (press(ev, BTN_BACK)) st.mode = MODE_MENU;
      return;
    }
    const dir = nav_delta(ev);
    if (dir) {
      const menu = { items: items(), sel: st.sel, top: st.top };
      menu_move(menu, dir, WIN);
      st.sel = menu.sel;
      st.top = menu.top;
    }
    if (press(ev, BTN_OK)) {
      const it = items()[st.sel];
      if (it) os_launch(it.id);
    }
    if (press(ev, BTN_BACK)) {
      st.mode = MODE_POWER;
      st.psel = 1;
    }
  },
  on_tick() {},
  on_draw(os, d) {
    ui_header(d, os, "nimo");
    const menu = { items: items(), sel: st.sel, top: st.top };
    menu_draw(d, menu, 0, 10, 128, 45, 15);
    st.top = menu.top;
    ui_footer(d, "▲▼ wybór   ● wejdź");
    if (st.mode === MODE_POWER) {
      dialog_draw(d, "Uśpić nimo?", ["Tak", "Nie"], st.psel);
      ui_set(os, ["wybór", "wybór", "zatwierdź", "anuluj"], -1);
    } else {
      ui_set(os, ["wyżej", "niżej", "wejdź", "uśpij"], -1);
    }
  },
};
