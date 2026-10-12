/**
 * Samouczek przycisków. Kroki, które czekają na konkretny przycisk,
 * nie puszczają dalej złego wciśnięcia — użytkownik ma je poczuć.
 * Długie ◄ pomija całość (oprócz lekcji o przytrzymaniu, gdzie ono idzie dalej).
 */

import { BTN_BACK, BTN_DOWN, BTN_OK, BTN_UP, BEEP_ERR } from "../nimo_config.js";
import { display_fill_rect, display_pixel, display_text } from "../nimo_display.js";
import { long, nav_delta, press } from "../nimo_input.js";
import { os_launch, os_persist, os_pop } from "../nimo_os.js";
import {
  draw_mark,
  menu_draw,
  menu_move,
  ui_footer,
  ui_header,
  ui_set,
  wrap_lines,
} from "../nimo_ui.js";

const STEPS = [
  {
    title: "Witaj",
    body: "Jestem nimo. Poligon firmware, zanim wgrasz kod na ESP32. Długie ◄ pomija.",
    footer: "● dalej",
    expect: "ok",
    highlight: BTN_OK,
    hints: ["", "", "dalej", "pomiń"],
  },
  {
    title: "4 przyciski",
    body: "Stoją po prawej, jeden pod drugim. Od góry: góra, dół, OK, wstecz.",
    footer: "● dalej",
    expect: "ok",
    highlight: BTN_OK,
    hints: ["góra", "dół", "OK", "wstecz"],
  },
  {
    title: "Góra",
    body: "Przesuwa wybór w górę. W Snake też w górę.",
    footer: "Naciśnij ▲",
    expect: "btn",
    button: BTN_UP,
    highlight: BTN_UP,
    mark: "up",
    hints: ["naciśnij", "dół", "OK", "wstecz"],
  },
  {
    title: "Dół",
    body: "Przesuwa wybór w dół. W Snake też w dół.",
    footer: "Naciśnij ▼",
    expect: "btn",
    button: BTN_DOWN,
    highlight: BTN_DOWN,
    mark: "down",
    hints: ["góra", "naciśnij", "OK", "wstecz"],
  },
  {
    title: "OK",
    body: "Wchodzi w pozycję i zatwierdza wybór.",
    footer: "Naciśnij ●",
    expect: "btn",
    button: BTN_OK,
    highlight: BTN_OK,
    mark: "ok",
    hints: ["góra", "dół", "naciśnij", "wstecz"],
  },
  {
    title: "Wstecz",
    body: "Cofa do poprzedniego ekranu. Krótkie naciśnięcie.",
    footer: "Naciśnij ◄",
    expect: "btn",
    button: BTN_BACK,
    highlight: BTN_BACK,
    mark: "back",
    hints: ["góra", "dół", "OK", "naciśnij"],
  },
  {
    title: "Spróbuj",
    demo: true,
    footer: "zejdź na Dalej",
    expect: "demo",
    highlight: BTN_DOWN,
    hints: ["wyżej", "niżej", "wybierz", "wróć"],
  },
  {
    title: "Przytrzymaj",
    body: "Dłuższe ◄ wychodzi z aplikacji. Tutaj przechodzi dalej.",
    footer: "Przytrzymaj ◄",
    expect: "long-back",
    highlight: BTN_BACK,
    mark: "back",
    hints: ["góra", "dół", "OK", "przytrzymaj"],
    subs: ["", "", "", "trzymaj pół sekundy"],
  },
  {
    title: "W Snake",
    body: "▲ góra, ▼ dół, ● prawo. ◄ lewo po puszczeniu. Przytrzymaj ◄ to pauza.",
    footer: "● dalej",
    expect: "ok",
    highlight: BTN_OK,
    hints: ["góra", "dół", "prawo", "lewo / pauza"],
  },
  {
    title: "W pisaniu",
    body: "▲▼ wybierają znak. ● wstawia, ◄ kasuje. Przytrzymaj ● aby wysłać.",
    footer: "● dalej",
    expect: "ok",
    highlight: BTN_OK,
    hints: ["znak -", "znak +", "wstaw / wyślij", "kasuj"],
  },
  {
    title: "Gotowe",
    body: "Pulpit z ikonami: Czat, Gierki, Ustawienia i Alerty.",
    footer: "● do menu",
    expect: "ok",
    highlight: BTN_OK,
    hints: ["", "", "do menu", ""],
  },
];

const DEMO = [
  { label: "Czat" },
  { label: "Gierki" },
  { label: "Dalej" },
];

const st = {
  step: 0,
  moved: false,
  sel: 0,
  top: 0,
  flash: "",
  flashUntil: 0,
};

function finish(os) {
  os.settings.tutorial_done = 1;
  os_persist();
  if (os.stack.length > 1) os_pop();
  else os_launch("home", "replace");
}

function flash(os, text) {
  st.flash = text;
  st.flashUntil = os.now + 700;
  os.platform.beep(BEEP_ERR);
}

function advance() {
  st.step++;
  st.moved = false;
  st.sel = 0;
  st.top = 0;
  st.flash = "";
}

export const app_tutorial = {
  id: "tutorial",
  on_enter() {
    st.step = 0;
    st.moved = false;
    st.sel = 0;
    st.top = 0;
    st.flash = "";
    st.flashUntil = 0;
  },
  on_exit() {},
  on_input(os, ev) {
    const step = STEPS[st.step];
    if (!step) return;
    const skipping = long(ev, BTN_BACK) && step.expect !== "long-back";
    if (skipping) {
      finish(os);
      return;
    }
    if (step.expect === "demo") {
      const dir = nav_delta(ev);
      if (dir) {
        const menu = { items: DEMO, sel: st.sel, top: st.top };
        menu_move(menu, dir, 3);
        st.sel = menu.sel;
        st.top = menu.top;
        st.moved = true;
      }
      if (press(ev, BTN_OK)) {
        if (!st.moved) flash(os, "Najpierw ▲ lub ▼");
        else if (st.sel !== 2) flash(os, "Wybierz Dalej");
        else advance();
      }
      if (press(ev, BTN_BACK) && st.step > 0) st.step--;
      return;
    }
    if (step.expect === "btn") {
      if (press(ev, step.button)) advance();
      else if (press(ev, BTN_UP) || press(ev, BTN_DOWN) || press(ev, BTN_OK) || press(ev, BTN_BACK)) {
        flash(os, "To nie ten");
      }
      return;
    }
    if (step.expect === "long-back") {
      if (long(ev, BTN_BACK)) advance();
      else if (press(ev, BTN_BACK)) flash(os, "Przytrzymaj ◄");
      else if (press(ev, BTN_OK) || press(ev, BTN_UP) || press(ev, BTN_DOWN)) flash(os, "To nie ten");
      return;
    }
    if (press(ev, BTN_OK)) {
      if (st.step >= STEPS.length - 1) finish(os);
      else advance();
    } else if (press(ev, BTN_BACK) && st.step > 0) {
      st.step--;
    }
  },
  on_tick() {},
  on_draw(os, d) {
    const step = STEPS[Math.min(st.step, STEPS.length - 1)];
    ui_header(d, os, step.title, { plain: true });
    draw_dots(d, st.step, STEPS.length);
    if (step.demo) {
      const menu = { items: DEMO, sel: st.sel, top: st.top };
      menu_draw(d, menu, 0, 12, 128, 40, 13);
    } else {
      const cols = step.mark ? 14 : 21;
      const lines = wrap_lines(step.body, cols);
      const max = step.mark ? 4 : 5;
      for (let i = 0; i < lines.length && i < max; i++) {
        display_text(d, 1, 12 + i * 8, lines[i], 1);
      }
      if (step.mark) draw_mark(d, step.mark, 100, 22);
    }
    const showFlash = os.now < st.flashUntil;
    ui_footer(d, showFlash ? st.flash : step.footer);
    ui_set(os, step.hints, step.highlight, { subs: step.subs });
  },
};

function draw_dots(d, index, n) {
  const gap = 4;
  let x = 126 - n * gap;
  for (let i = 0; i < n; i++) {
    if (i === index) display_fill_rect(d, x, 2, 3, 3, 1);
    else display_pixel(d, x + 1, 3, 1);
    x += gap;
  }
}

export function tutorial_step_count() {
  return STEPS.length;
}
