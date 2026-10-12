/**
 * Krótka lista. Cztery przyciski: zaznacz, dodaj, kasuj znak.
 * Litery z klawiatury komputera wchodzą od razu — na ESP32 zostaje siatka.
 */

import { BTN_BACK, BTN_OK, BEEP_ERR, BEEP_OK, EV_CHAR } from "../nimo_config.js";
import { display_fill_rect, display_round, display_text, display_text_center } from "../nimo_display.js";
import { long, nav_delta, press, tap } from "../nimo_input.js";
import { os_persist, os_pop } from "../nimo_os.js";
import { menu_draw, menu_move, trunc, ui_footer, ui_header, ui_set } from "../nimo_ui.js";

const MAX = 18;
const CHARSET = "aąbcćdeęfghijklłmnńoópqrsśtuvwxyzźż0123456789 -";

const st = {
  mode: "list",
  sel: 0,
  top: 0,
  draft: "",
  ci: 0,
};

function chars() {
  return Array.from(CHARSET);
}

function box_icon(done) {
  return (d, x, y, c) => {
    display_round(d, x, y + 1, 7, 7, c);
    if (done) display_fill_rect(d, x + 2, y + 3, 3, 3, c);
  };
}

function items(os) {
  const rows = (os.pad || []).map((item) => ({
    label: trunc(item.text, 16),
    icon: box_icon(item.done),
    add: 0,
  }));
  if (rows.length < 8) rows.push({ label: "+ dodaj", icon: null, add: 1 });
  return rows;
}

function save_draft(os) {
  const text = st.draft.trim();
  if (!text) {
    os.platform.beep(BEEP_ERR);
    return;
  }
  os.pad = os.pad || [];
  os.pad.push({ text: text.slice(0, MAX), done: 0 });
  os_persist();
  os.platform.beep(BEEP_OK);
  st.mode = "list";
  st.sel = os.pad.length - 1;
}

export const app_pad = {
  id: "pad",
  on_enter() {
    st.mode = "list";
    st.sel = 0;
    st.top = 0;
  },
  on_exit() {},
  on_resume() {},
  on_input(os, ev) {
    if (st.mode === "edit") return on_edit(os, ev);
    const menu = { items: items(os), sel: st.sel, top: st.top };
    const dir = nav_delta(ev);
    if (dir && menu.items.length) {
      menu_move(menu, dir, 4);
      st.sel = menu.sel;
      st.top = menu.top;
    }
    if (press(ev, BTN_OK) && menu.items.length) {
      const it = menu.items[st.sel];
      if (it.add) {
        st.mode = "edit";
        st.draft = "";
        st.ci = 0;
      } else if (os.pad[st.sel]) {
        os.pad[st.sel].done = os.pad[st.sel].done ? 0 : 1;
        os_persist();
      }
    }
    if (press(ev, BTN_BACK)) os_pop();
  },
  on_tick() {},
  on_draw(os, d) {
    if (st.mode === "edit") return draw_edit(os, d);
    ui_header(d, os, "Lista");
    const menu = { items: items(os), sel: st.sel, top: st.top };
    if (!os.pad || !os.pad.length) {
      display_text_center(d, 28, "Pusto.", 1);
    }
    menu_draw(d, menu, 0, 10, 128, 44, 11);
    st.top = menu.top;
    ui_footer(d, "● zaznacz   ◄ wróć");
    ui_set(os, ["wyżej", "niżej", "zaznacz", "wróć"], -1);
  },
};

function on_edit(os, ev) {
  const set = chars();
  if (ev.type === EV_CHAR && ev.ch && ev.ch !== "\n") {
    if (Array.from(st.draft).length < MAX) st.draft += ev.ch;
    return;
  }
  const dir = nav_delta(ev);
  if (dir) st.ci = (st.ci + (dir > 0 ? 1 : -1) + set.length) % set.length;
  if (tap(ev, BTN_OK)) {
    if (Array.from(st.draft).length < MAX) st.draft += set[st.ci];
  }
  if (long(ev, BTN_OK)) save_draft(os);
  if (press(ev, BTN_BACK)) {
    if (!st.draft) st.mode = "list";
    else st.draft = Array.from(st.draft).slice(0, -1).join("");
  }
}

function draw_edit(os, d) {
  ui_header(d, os, "Nowa");
  display_text(d, 2, 12, trunc(st.draft || "_", 20), 1);
  const ch = chars()[st.ci] === " " ? "spacja" : chars()[st.ci];
  display_text_center(d, 28, ch, 1);
  display_text_center(d, 40, "przytrzymaj ● = zapis", 1);
  ui_footer(d, "● wstaw   ◄ kasuj");
  ui_set(os, ["znak -", "znak +", "wstaw", "kasuj"], -1, { text: "full" });
}
