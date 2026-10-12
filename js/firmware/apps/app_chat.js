/**
 * Czat. Szybkie odpowiedzi plus siatka znaków na 4 przyciskach.
 *
 * Pisanie (mapuje się 1:1 na ESP32, bez klawiatury PC):
 *   ▲▼  poprzedni / następny znak (przytrzymanie przyspiesza)
 *   ●   wstawia (puszczenie). Przytrzymanie wysyła.
 *   ◄   kasuje. Pusty tekst + ◄ wraca.
 *   »   na siatce też wysyła.
 *
 * Zdarzenie CHAR jest tylko z symulatora (klawiatura komputera).
 * Na układzie go nie będzie, chyba że dołożysz USB/serial.
 */

import { BTN_BACK, BTN_OK, BEEP_ERR, BEEP_OK, EV_CHAR } from "../nimo_config.js";
import { display_fill_rect, display_hline, display_text, text_width } from "../nimo_display.js";
import { long, nav_delta, press, press_or_repeat, tap } from "../nimo_input.js";
import { os_log, os_persist, os_pop } from "../nimo_os.js";
import { menu_draw, menu_move, trunc, ui_footer, ui_header, ui_set, wrap_lines } from "../nimo_ui.js";

const MSG_MAX = 32;
const THREAD_MAX = 12;
const QUICK = ["Hej!", "Jestem", "Dzięki", "Na miejscu", "Wpisz..."];

export const KEY_ROWS = [
  "ABCDEFGHIJKLMNOP",
  "QRSTUVWXYZ012345",
  "6789.,!?'\"-+:/()",
  "abcdefghijklmnop",
  "qrstuvwxyząćęłńó",
  "śźżĄĆĘŁŃÓŚŹŻ␣⌫»…",
];
const KEYS = KEY_ROWS.join("");
const KEY_COLS = 16;

const st = {
  mode: "list",
  sel: 0,
  top: 0,
  contact: 0,
  lineTop: 0,
  stick: true,
  draft: "",
  grid: 0,
  swallowTap: false,
  qsel: 0,
  qtop: 0,
  replyAt: 0,
  replyText: "",
  replyId: "",
};

function contact() {
  return null;
}

function find_contact(os, id) {
  return os.chat.find((c) => c.id === id);
}

function reply_for(id, text) {
  const t = text.toLowerCase();
  if (t.includes("snake") || t.includes("gra")) return "Nie zawracaj węża.";
  if (t.includes("hej") || t.includes("cze")) return "Hej! Widzę piksele.";
  if (t.includes("ok") || t.includes("dzięki") || t.includes("dzieki")) return "Działam.";
  if (id === "ada") return "Śmiało, to poligon.";
  if (id === "leon") return "Rekord sam nie urośnie.";
  if (id === "hub") return "Logika jest w firmware.";
  return "Przyjęte.";
}

function push_msg(os, id, me, text) {
  const c = find_contact(os, id);
  if (!c) return;
  c.messages.push({ me, text: Array.from(text).slice(0, MSG_MAX).join("") });
  if (c.messages.length > THREAD_MAX) c.messages.splice(0, c.messages.length - THREAD_MAX);
  if (!me && !(st.mode === "thread" && os.chat[st.contact] && os.chat[st.contact].id === id)) c.unread = 1;
  os_persist();
}

function send_draft(os) {
  const text = st.draft.trim();
  if (!text) {
    os.platform.beep(BEEP_ERR);
    return;
  }
  const c = os.chat[st.contact];
  push_msg(os, c.id, 1, text);
  os.platform.beep(BEEP_OK);
  os_log("chat send " + c.id);
  st.draft = "";
  st.mode = "thread";
  st.stick = true;
  st.replyId = c.id;
  st.replyText = reply_for(c.id, text);
  st.replyAt = os.now + 780;
}

function insert_char(os, ch) {
  if (Array.from(st.draft).length >= MSG_MAX) {
    os.platform.beep(BEEP_ERR);
    return;
  }
  st.draft += ch;
}

function backspace() {
  const a = Array.from(st.draft);
  a.pop();
  st.draft = a.join("");
}

function activate_cell(os) {
  const ch = Array.from(KEYS)[st.grid];
  if (!ch) return;
  if (ch === "␣") insert_char(os, " ");
  else if (ch === "⌫") backspace();
  else if (ch === "»") send_draft(os);
  else if (ch === "…") insert_char(os, "...");
  else insert_char(os, ch);
}

function thread_lines(c) {
  const lines = [];
  let prev = -1;
  for (const m of c.messages) {
    if (prev !== -1 && prev !== m.me) lines.push({ gap: true });
    prev = m.me;
    const wrapped = wrap_lines(m.text, 18);
    wrapped.forEach((text, i) => lines.push({ me: m.me, text, first: i === 0 }));
  }
  if (st.replyAt && st.replyId === c.id) lines.push({ me: 0, text: "...", first: true });
  return lines;
}

export const app_chat = {
  id: "chat",
  on_enter() {
    st.mode = "list";
    st.replyAt = 0;
  },
  on_exit() {},
  on_resume() {},
  on_input(os, ev) {
    if (ev.type === EV_CHAR && ev.ch && st.mode !== "list") {
      if (st.mode !== "keys") {
        st.mode = "keys";
        st.draft = "";
        st.grid = 0;
      }
      if (ev.ch === "\n") return;
      insert_char(os, ev.ch);
      return;
    }
    if (st.mode === "list") return on_list(os, ev);
    if (st.mode === "thread") return on_thread(os, ev);
    if (st.mode === "quick") return on_quick(os, ev);
    if (st.mode === "keys") return on_keys(os, ev);
  },
  on_tick(os) {
    if (st.replyAt && os.now >= st.replyAt) {
      const id = st.replyId;
      const text = st.replyText;
      st.replyAt = 0;
      push_msg(os, id, 0, text);
      st.stick = true;
    }
  },
  on_draw(os, d) {
    if (st.mode === "list") draw_list(os, d);
    else if (st.mode === "thread") draw_thread(os, d);
    else if (st.mode === "quick") draw_quick(os, d);
    else draw_keys(os, d);
  },
};

function on_list(os, ev) {
  const n = os.chat.length;
  const dir = nav_delta(ev);
  if (dir) {
    const menu = { items: os.chat, sel: st.sel, top: st.top };
    menu_move(menu, dir, 3);
    st.sel = menu.sel;
    st.top = menu.top;
  }
  if (press(ev, BTN_OK) && n) {
    st.contact = st.sel;
    st.mode = "thread";
    st.stick = true;
    os.chat[st.contact].unread = 0;
    os_persist();
  }
  if (press(ev, BTN_BACK)) os_pop();
}

function on_thread(os, ev) {
  const c = os.chat[st.contact];
  const lines = thread_lines(c);
  const vis = 5;
  const maxTop = Math.max(0, lines.length - vis);
  if (st.stick) st.lineTop = maxTop;
  const dir = nav_delta(ev);
  if (dir < 0 && st.lineTop > 0) {
    st.lineTop--;
    st.stick = false;
  }
  if (dir > 0 && st.lineTop < maxTop) {
    st.lineTop++;
    st.stick = st.lineTop >= maxTop;
  }
  if (press(ev, BTN_OK)) {
    st.mode = "quick";
    st.qsel = 0;
    st.qtop = 0;
  }
  if (press(ev, BTN_BACK)) st.mode = "list";
}

function on_quick(os, ev) {
  const items = QUICK.map((label) => ({ label }));
  const menu = { items, sel: st.qsel, top: st.qtop };
  const dir = nav_delta(ev);
  if (dir) {
    menu_move(menu, dir, 4);
    st.qsel = menu.sel;
    st.qtop = menu.top;
  }
  if (press(ev, BTN_OK)) {
    if (st.qsel === QUICK.length - 1) {
      st.mode = "keys";
      st.draft = "";
      st.grid = 0;
      st.swallowTap = true;
    } else {
      st.draft = QUICK[st.qsel];
      send_draft(os);
    }
  }
  if (press(ev, BTN_BACK)) st.mode = "thread";
}

function on_keys(os, ev) {
  const n = Array.from(KEYS).length;
  const dir = nav_delta(ev);
  if (dir) {
    st.grid = (st.grid + (dir > 0 ? 1 : -1) + n) % n;
  }
  if (tap(ev, BTN_OK)) {
    if (st.swallowTap) {
      st.swallowTap = false;
      return;
    }
    activate_cell(os);
  }
  if (long(ev, BTN_OK)) send_draft(os);
  if (press_or_repeat(ev, BTN_BACK)) {
    if (Array.from(st.draft).length) backspace();
    else if (press(ev, BTN_BACK)) st.mode = "quick";
  }
}

function draw_list(os, d) {
  ui_header(d, os, "Czat");
  const itemH = 14;
  for (let i = 0; i < os.chat.length; i++) {
    const c = os.chat[i];
    const y = 12 + i * itemH;
    const on = i === st.sel;
    if (on) display_fill_rect(d, 0, y, 128, itemH - 2, 1);
    const col = on ? 0 : 1;
    display_text(d, 4, y + 2, c.name, col);
    const prev = c.messages.length ? c.messages[c.messages.length - 1].text : "";
    display_text(d, 62, y + 2, trunc(prev, 8), col);
    if (c.unread) display_fill_rect(d, 120, y + 4, 4, 4, col);
  }
  ui_footer(d, "▲▼ lista   ● czytaj");
  ui_set(os, ["wyżej", "niżej", "czytaj", "wróć"], -1, { text: "type" });
}

function draw_thread(os, d) {
  const c = os.chat[st.contact];
  ui_header(d, os, c.name);
  const lines = thread_lines(c);
  const vis = 5;
  const maxTop = Math.max(0, lines.length - vis);
  if (st.stick) st.lineTop = maxTop;
  if (st.lineTop > maxTop) st.lineTop = maxTop;
  for (let i = 0; i < vis; i++) {
    const line = lines[st.lineTop + i];
    if (!line || line.gap) continue;
    const y = 12 + i * 8;
    const w = text_width(line.text);
    const x = line.me ? Math.max(8, 124 - w) : 3;
    display_text(d, x, y, line.text, 1);
    if (line.first) {
      if (line.me) display_fill_rect(d, 126, y + 2, 2, 3, 1);
      else display_fill_rect(d, 0, y + 2, 2, 3, 1);
    }
  }
  ui_footer(d, "▲▼ czytaj  ● pisz");
  ui_set(os, ["starsze", "nowsze", "odpowiedz", "lista"], -1, { text: "type" });
}

function draw_quick(os, d) {
  ui_header(d, os, "Odpowiedź");
  const items = QUICK.map((label) => ({ label }));
  const menu = { items, sel: st.qsel, top: st.qtop };
  menu_draw(d, menu, 0, 10, 128, 44, 11);
  ui_footer(d, "● wyślij");
  ui_set(os, ["wyżej", "niżej", "wyślij", "wróć"], -1, { text: "type" });
}

function draw_keys(os, d) {
  const chars = Array.from(st.draft);
  const view = 20;
  const start = chars.length > view ? chars.length - view : 0;
  const slice = chars.slice(start).join("");
  display_text(d, 1, 0, slice, 1);
  const blink = Math.floor(os.now / 180) % 3 !== 2;
  if (blink) display_fill_rect(d, 1 + Array.from(slice).length * 6, 0, 3, 7, 1);
  display_hline(d, 0, 8, 128, 1);
  const all = Array.from(KEYS);
  for (let i = 0; i < all.length; i++) {
    const col = i % KEY_COLS;
    const row = Math.floor(i / KEY_COLS);
    const x = 16 + col * 6;
    const y = 10 + row * 8;
    const on = i === st.grid;
    if (on) display_fill_rect(d, x, y, 5, 7, 1);
    display_text(d, x, y, all[i], on ? 0 : 1);
  }
  display_text(d, 1, 57, "● wstaw   ◄ kasuj", 1);
  ui_set(os, ["znak -", "znak +", "wstaw", "kasuj"], -1, {
    text: "full",
    subs: ["", "", "przytrzymaj: wyślij", "pusto: wróć"],
  });
}
