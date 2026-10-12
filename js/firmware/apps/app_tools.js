/**
 * Kostka i sterownik. Stoper i minutnik są w zegarze.
 */

import { BTN_BACK, BTN_OK } from "../nimo_config.js";
import { display_fill_rect, display_round, display_text_center } from "../nimo_display.js";
import { nav_delta, press } from "../nimo_input.js";
import { rand_int, rand_seed } from "../nimo_rand.js";
import { os_launch, os_pop } from "../nimo_os.js";
import { menu_draw, menu_move, ui_footer, ui_header, ui_set } from "../nimo_ui.js";

const LIST = [
  { id: "dice", label: "Kostka" },
  { id: "panel", label: "Sterownik" },
];

const st = {
  mode: "list",
  sel: 0,
  top: 0,
  acc: 0,
  face: 1,
  rolling: 0,
  rolls: 0,
  back: "list",
};

export const app_tools = {
  id: "tools",
  on_enter(os) {
    const want = os.intent && os.intent.tool;
    if (want === "stop" || want === "count" || want === "done") {
      os_launch("clock");
      return;
    }
    if (os.intent && os.intent.tool) os.intent.tool = "";
    if (want === "dice") {
      st.mode = "dice";
      st.back = "pop";
      return;
    }
    st.mode = "list";
    st.back = "list";
  },
  on_exit() {},
  on_resume() {},
  on_input(os, ev) {
    if (st.mode === "dice") return on_dice(os, ev);
    const menu = { items: LIST, sel: st.sel, top: st.top };
    const dir = nav_delta(ev);
    if (dir) {
      menu_move(menu, dir, 3);
      st.sel = menu.sel;
      st.top = menu.top;
    }
    if (press(ev, BTN_OK)) {
      const id = LIST[st.sel].id;
      if (id === "panel") os_launch("panel");
      else st.mode = id;
    }
    if (press(ev, BTN_BACK)) os_pop();
  },
  on_tick(os, dt) {
    if (st.mode === "dice" && st.rolling) {
      st.acc += dt;
      if (st.acc >= 70) {
        st.acc = 0;
        st.rolls++;
        st.face = 1 + rand_int(6);
      }
      if (st.rolls >= 7) st.rolling = 0;
    }
    void os;
  },
  on_draw(os, d) {
    if (st.mode === "dice") return draw_dice(os, d);
    ui_header(d, os, "Narzędzia");
    const menu = { items: LIST, sel: st.sel, top: st.top };
    menu_draw(d, menu, 0, 12, 128, 40, 13);
    ui_footer(d, "▲▼ wybór   ● wejdź");
    ui_set(os, ["wyżej", "niżej", "wejdź", "wróć"], -1);
  },
};

function on_dice(os, ev) {
  if (press(ev, BTN_OK) && !st.rolling) {
    rand_seed((os.now + os.uptime_ms + 17) >>> 0);
    st.rolling = 1;
    st.rolls = 0;
    st.acc = 0;
    st.face = 1 + rand_int(6);
  }
  if (press(ev, BTN_BACK) && !st.rolling) {
    if (st.back === "pop") os_pop();
    else st.mode = "list";
  }
}

function draw_dice(os, d) {
  ui_header(d, os, "Kostka");
  draw_face(d, st.face);
  ui_footer(d, st.rolling ? "..." : "● rzuć   ◄ lista");
  ui_set(os, ["", "", st.rolling ? "" : "rzuć", st.rolling ? "" : "lista"], -1);
}

function draw_face(d, face) {
  const x = 48;
  const y = 14;
  display_round(d, x, y, 32, 32, 1);
  const map = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
  };
  const pts = map[face] || map[1];
  for (let i = 0; i < pts.length; i++) {
    display_fill_rect(d, x + 6 + pts[i][0] * 8, y + 6 + pts[i][1] * 8, 4, 4, 1);
  }
}

export function tools_state() {
  return st;
}
