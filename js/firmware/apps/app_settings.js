/**
 * Ustawienia. Kontrast idzie na HAL (SSD1306 SETCONTRAST).
 * Barwa pikseli jest cechą symulatora — na module kolor jest fizyczny.
 */

import { BTN_BACK, BTN_OK, BEEP_ERR, BEEP_OK, COLOR_NAME, CONTRAST_STEPS } from "../nimo_config.js";
import { nav_delta, press } from "../nimo_input.js";
import { os_factory_reset, os_launch, os_persist, os_pop } from "../nimo_os.js";
import { display_fill_rect, display_rect, display_text } from "../nimo_display.js";
import { dialog_draw, menu_draw, menu_move, ui_footer, ui_header, ui_set } from "../nimo_ui.js";

const MODE_LIST = 0;
const MODE_CONTRAST = 1;
const MODE_RESET = 2;
const WIN = 4;

const st = {
  mode: MODE_LIST,
  sel: 0,
  top: 0,
  cidx: 4,
  saved: 255,
  rsel: 1,
};

function contrast_index(v) {
  let best = 0;
  let dist = 999;
  for (let i = 0; i < CONTRAST_STEPS.length; i++) {
    const dd = Math.abs(CONTRAST_STEPS[i] - v);
    if (dd < dist) {
      dist = dd;
      best = i;
    }
  }
  return best;
}

function contrast_label(v) {
  return Math.round((v / 255) * 100) + "%";
}

function items(os) {
  return [
    { id: "contrast", label: "Kontrast", value: contrast_label(os.settings.contrast) },
    { id: "sound", label: "Dźwięk", value: os.settings.sound ? "tak" : "nie" },
    { id: "color", label: "Barwa", value: COLOR_NAME[os.settings.color] || "?" },
    { id: "tutorial", label: "Samouczek", value: "" },
    { id: "about", label: "O systemie", value: "" },
    { id: "reset", label: "Reset danych", value: "" },
  ];
}

function apply_contrast(os, v) {
  os.settings.contrast = v;
  if (os.platform.set_contrast) os.platform.set_contrast(v);
}

export const app_settings = {
  id: "settings",
  on_enter(os) {
    st.mode = MODE_LIST;
    st.cidx = contrast_index(os.settings.contrast);
  },
  on_exit() {},
  on_input(os, ev) {
    if (st.mode === MODE_RESET) {
      const dir = nav_delta(ev);
      if (dir) st.rsel = st.rsel ? 0 : 1;
      if (press(ev, BTN_BACK)) st.mode = MODE_LIST;
      if (press(ev, BTN_OK)) {
        if (st.rsel === 0) {
          os_factory_reset();
          if (os.platform.reboot) os.platform.reboot();
        } else st.mode = MODE_LIST;
      }
      return;
    }
    if (st.mode === MODE_CONTRAST) {
      const dir = nav_delta(ev);
      if (dir > 0 && st.cidx < CONTRAST_STEPS.length - 1) st.cidx++;
      else if (dir < 0 && st.cidx > 0) st.cidx--;
      else if (dir) os.platform.beep(BEEP_ERR);
      if (dir) apply_contrast(os, CONTRAST_STEPS[st.cidx]);
      if (press(ev, BTN_OK)) {
        os_persist();
        st.mode = MODE_LIST;
        os.platform.beep(BEEP_OK);
      }
      if (press(ev, BTN_BACK)) {
        apply_contrast(os, st.saved);
        st.mode = MODE_LIST;
      }
      return;
    }
    const menu = { items: items(os), sel: st.sel, top: st.top };
    const dir = nav_delta(ev);
    if (dir) {
      menu_move(menu, dir, WIN);
      st.sel = menu.sel;
      st.top = menu.top;
    }
    if (press(ev, BTN_BACK)) os_pop();
    if (!press(ev, BTN_OK)) return;
    const id = items(os)[st.sel]?.id;
    if (id === "contrast") {
      st.saved = os.settings.contrast;
      st.cidx = contrast_index(os.settings.contrast);
      st.mode = MODE_CONTRAST;
    } else if (id === "sound") {
      os.settings.sound = os.settings.sound ? 0 : 1;
      os_persist();
      os.platform.beep(BEEP_OK);
    } else if (id === "color") {
      os.settings.color = (os.settings.color + 1) % COLOR_NAME.length;
      os_persist();
      if (os.platform.set_pixel_color) os.platform.set_pixel_color(os.settings.color);
    } else if (id === "tutorial") {
      os_launch("tutorial");
    } else if (id === "about") {
      os_launch("about");
    } else if (id === "reset") {
      st.mode = MODE_RESET;
      st.rsel = 1;
    }
  },
  on_tick() {},
  on_draw(os, d) {
    ui_header(d, os, "Ustawienia");
    if (st.mode === MODE_CONTRAST) {
      display_text(d, 2, 16, "Kontrast", 1);
      const pct = os.settings.contrast / 255;
      display_rect(d, 2, 30, 80, 9, 1);
      const fill = Math.floor(76 * pct);
      if (fill) display_fill_rect(d, 4, 32, fill, 5, 1);
      display_text(d, 86, 31, contrast_label(os.settings.contrast), 1);
      ui_footer(d, "▲▼ wartość ● zapisz");
      ui_set(os, ["ciemniej", "jaśniej", "zapisz", "anuluj"], -1);
      return;
    }
    const menu = { items: items(os), sel: st.sel, top: st.top };
    menu_draw(d, menu, 0, 10, 128, 44, 11);
    ui_footer(d, "▲▼ wybór   ● zmień");
    ui_set(os, ["wyżej", "niżej", "zmień", "wróć"], -1);
    if (st.mode === MODE_RESET) {
      dialog_draw(d, "Na pewno?", ["Tak, kasuj", "Nie"], st.rsel);
      ui_set(os, ["wybór", "wybór", "zatwierdź", "anuluj"], -1);
    }
  },
};
