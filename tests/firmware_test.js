/**
 * Testy logiki firmware bez przeglądarki.
 * Uruchom: node tests/firmware_test.js
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { BTN_BACK, BTN_DOWN, BTN_OK, BTN_UP, EV_CHAR, EV_LONG, EV_PRESS, EV_RELEASE, EV_TAP } from "../js/firmware/nimo_config.js";
import { clear_missing, missing_glyphs } from "../js/firmware/nimo_display.js";
import { launch } from "../js/firmware/nimo_apps.js";
import { os, os_frame, os_init, os_on_event, os_top } from "../js/firmware/nimo_os.js";
import { KEY_ROWS } from "../js/firmware/apps/app_chat.js";
import { snake_state } from "../js/firmware/apps/app_snake.js";
import { memory_state } from "../js/firmware/apps/app_memory.js";
import { tutorial_step_count } from "../js/firmware/apps/app_tutorial.js";

const mem = {};
const beeps = [];
const platform = {
  storage_get(k, fb) {
    return k in mem ? JSON.parse(JSON.stringify(mem[k])) : fb;
  },
  storage_set(k, v) {
    mem[k] = JSON.parse(JSON.stringify(v));
  },
  beep(id) { beeps.push(id); },
  reboot() { launch("boot", "replace"); },
  set_contrast() {},
  set_pixel_color() {},
};

let t = 1000;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  }
}

function press(btn) {
  t += 40;
  os_on_event({ type: EV_PRESS, button: btn, now: t });
  t += 50;
  os_on_event({ type: EV_RELEASE, button: btn, now: t });
  os_on_event({ type: EV_TAP, button: btn, now: t });
  os_frame(t);
}

function holdLong(btn) {
  t += 40;
  os_on_event({ type: EV_PRESS, button: btn, now: t });
  t += 560;
  os_on_event({ type: EV_LONG, button: btn, now: t });
  t += 40;
  os_on_event({ type: EV_RELEASE, button: btn, now: t });
  os_frame(t);
}

function tick(ms) {
  t += ms;
  os_frame(t);
}

function dump(name) {
  mkdirSync("/tmp/nimo-frames", { recursive: true });
  writeFileSync("/tmp/nimo-frames/" + name + ".raw", Buffer.from(os.display.buf));
}

os_init(platform);
os.hour = 14;
os.minute = 5;
launch("boot");
os_frame(t);
dump("01-boot");
assert(os_top().id === "boot", "boot on start");

press(BTN_OK);
assert(os_top().id === "tutorial", "boot skip goes to tutorial");
dump("02-tutorial-welcome");

const steps = tutorial_step_count();
assert(steps === 11, "11 tutorial steps, got " + steps);

press(BTN_OK); // welcome → four buttons
dump("03-tutorial-buttons");
press(BTN_OK); // → góra
press(BTN_UP);
press(BTN_DOWN);
press(BTN_OK);
press(BTN_BACK);
dump("04-tutorial-demo");
press(BTN_DOWN);
press(BTN_DOWN);
dump("05-tutorial-demo");
press(BTN_OK); // Dalej
holdLong(BTN_BACK); // lekcja przytrzymania
press(BTN_OK); // snake
press(BTN_OK); // pisanie
dump("06-tutorial-done");
press(BTN_OK);
assert(os_top().id === "home", "tutorial ends at home, got " + (os_top() && os_top().id));
assert(os.settings.tutorial_done === 1, "tutorial flag saved");
dump("07-home");

// wrong button does not skip a required step — re-enter tutorial
os.event_button = -1;
launch("tutorial");
press(BTN_DOWN); // wrong on welcome (expects OK)
assert(os_top().id === "tutorial", "wrong button stays in tutorial");
press(BTN_BACK); // still wrong
press(BTN_OK);
assert(os.ui.hints[0] === "naciśnij" || os.ui.hints[2] === "OK" || os_top().id === "tutorial", "still teaching");

// jump home for the rest
os.settings.tutorial_done = 1;
os.event_button = -1;
launch("home", "replace");
os_frame(t);
assert(os_top().id === "home", "replaced with home");

// z Czatu góra zawija na Alerty, nie na Ustawienia
press(BTN_UP);
press(BTN_OK);
assert(os_top().id === "home", "up-wrap stays on home alerts, got " + (os_top() && os_top().id));
assert(os.ui.hints[3] === "pulpit", "shade is home mode, hints " + (os.ui.hints || []).join("|"));
dump("07b-shade");
press(BTN_BACK);
press(BTN_UP);
press(BTN_OK);
assert(os_top().id === "settings", "up from alerts opens settings, got " + (os_top() && os_top().id));
dump("08-settings");

press(BTN_OK); // contrast edit
dump("09-contrast");
press(BTN_DOWN);
press(BTN_OK); // save
press(BTN_DOWN); // sound
press(BTN_OK); // toggle
assert(os.settings.sound === 0, "sound toggled off");
press(BTN_BACK);
assert(os_top().id === "home", "back from settings");

// po ustawieniach (sel 2) jeden dół to Alerty, nie Czat
press(BTN_DOWN);
press(BTN_OK);
assert(os_top().id === "home", "one down from settings opens alerts, got " + (os_top() && os_top().id));
press(BTN_BACK);
press(BTN_DOWN); // Alerty → Czat
press(BTN_OK);
assert(os_top().id === "chat", "open chat, got " + os_top().id);
dump("10-chat-list");
press(BTN_OK); // open Ada
dump("11-chat-thread");
press(BTN_OK); // quick replies
dump("12-chat-quick");
press(BTN_OK); // send Hej!
tick(900);
dump("13-chat-reply");
const ada = os.chat[0];
assert(ada.messages.some((m) => m.me === 1 && m.text === "Hej!"), "sent Hej!");
assert(ada.messages.some((m) => m.me === 0 && m.text.includes("piksele")), "bot replied");

press(BTN_OK); // quick again
// move to Wpisz...
press(BTN_DOWN);
press(BTN_DOWN);
press(BTN_DOWN);
press(BTN_DOWN);
press(BTN_OK);
assert(os.ui.text_entry === "full", "keyboard text entry");
dump("14-composer");
// swallowed tap should not have inserted A
const before = os.chat[0].messages.length;
t += 20;
os_on_event({ type: EV_CHAR, button: -1, ch: "O", now: t });
os_on_event({ type: EV_CHAR, button: -1, ch: "k", now: t });
os_frame(t);
dump("15-composer-ok");
holdLong(BTN_OK);
tick(900);
assert(os.chat[0].messages.some((m) => m.text === "Ok"), "sent typed Ok, messages " + os.chat[0].messages.length + " before " + before);

press(BTN_BACK); // thread -> list? mode is thread after send. BACK goes to list.
press(BTN_BACK);
assert(os_top().id === "home", "back to home from chat");

// games + snake death
press(BTN_DOWN); // Gierki (sel was 0)
press(BTN_OK);
assert(os_top().id === "games", "games, got " + os_top().id);
dump("16-games");
press(BTN_OK);
assert(os_top().id === "snake", "snake");
dump("17-snake-intro");
press(BTN_OK);
const snake = snake_state();
assert(snake.mode === "play", "snake playing");
tick(250);
dump("18-snake-play");
// turn up and run into the wall
press(BTN_UP);
for (let i = 0; i < 12; i++) tick(220);
assert(snake.mode === "dead", "snake dies on wall, mode " + snake.mode);
dump("19-snake-dead");
press(BTN_BACK);
assert(os_top().id === "games", "leave snake");

// memory
press(BTN_DOWN);
press(BTN_OK);
assert(os_top().id === "memory", "memory");
dump("20-memory-intro");
press(BTN_OK);
tick(30);
const memst = memory_state();
assert(memst.mode === "show", "memory showing");
dump("21-memory-show");
// fail on purpose once input starts — skip show by ticking a lot
for (let i = 0; i < 40; i++) tick(200);
if (memst.mode === "input") {
  const wrong = (memst.seq[0] + 1) % 4;
  press(wrong);
  assert(memst.mode === "fail", "memory fail");
  dump("22-memory-fail");
}
press(BTN_BACK);

// sleep
os.event_button = -1;
launch("home", "replace");
press(BTN_BACK);
dump("23-power");
press(BTN_UP); // Tak is not default (psel starts at 1 = Nie). UP toggles.
press(BTN_OK);
assert(os_top().id === "sleep", "asleep, got " + os_top().id);
dump("24-sleep");
press(BTN_OK);
assert(os_top().id === "home", "wake");

os.event_button = -1;
os.intent = { contact: "hub" };
launch("chat");
os_frame(t);
const hub = os.chat.find((c) => c.id === "hub");
assert(hub && hub.unread === 0, "alert opens chat and clears unread");
dump("25-note-chat");
press(BTN_BACK);
press(BTN_BACK);
assert(os_top().id === "home", "back from note chat");

// glyph coverage
clear_missing();
os_frame(t);
const missing = missing_glyphs();
assert(missing.length === 0, "missing glyphs: " + missing.join(" "));

for (const row of KEY_ROWS) {
  assert([...row].length === 16, "key row width " + [...row].length + " " + row);
}

// persist roundtrip
os_init(platform);
launch("home");
assert(os.settings.sound === 0, "sound persisted");
assert(os.settings.tutorial_done === 1, "tutorial persisted");
assert(os.chat[0].messages.some((m) => m.text === "Ok"), "chat persisted");

console.log(failed ? failed + " failed" : "ok");
process.exit(failed ? 1 : 0);
