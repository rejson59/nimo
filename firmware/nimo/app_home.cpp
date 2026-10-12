#include "app_home.h"
#include "nimo_display.h"
#include "nimo_ui.h"

#include <cstdio>
#include <cstring>

static const NimoMenuItem HOME_ITEMS[] = {
  {"chat", "Czat"},
  {"games", "Gierki"},
  {"settings", "Ustawienia"},
};

static NimoMenu menu = {HOME_ITEMS, 3, 0, 0};
static uint8_t mode = 0;  // 0 menu, 1 power
static uint8_t psel = 1;

static void home_enter() {
  mode = 0;
  psel = 1;
}

static void home_input(const NimoEvent* ev) {
  if (mode == 1) {
    if (nav_delta(ev)) psel = psel ? 0 : 1;
    if (press_btn(ev, BTN_OK)) {
      if (psel == 0) nimo_os_launch("sleep", "push");
      else mode = 0;
    }
    if (press_btn(ev, BTN_BACK)) mode = 0;
    return;
  }
  int dir = nav_delta(ev);
  if (dir) menu_move(&menu, dir, 3);
  if (press_btn(ev, BTN_OK)) nimo_os_launch(HOME_ITEMS[menu.sel].id, "push");
  if (press_btn(ev, BTN_BACK)) {
    mode = 1;
    psel = 1;
  }
}

static void home_draw() {
  ui_header("nimo");
  menu_draw(&menu, 0, 10, 128, 45, 15);
  ui_footer("wybor / OK wejdź");
  if (mode == 1) {
    const char* opts[] = {"Tak", "Nie"};
    dialog_draw("Uspic nimo?", opts, 2, psel);
  }
}

static NimoApp HOME = {"home", home_enter, nullptr, home_input, nullptr, home_draw, home_enter};

NimoApp* app_home() { return &HOME; }

// Ekrany, których pełna logika jest w js/firmware/apps — tu tylko powrót.
static char stubTitle[16] = "nimo";
static char stubFile[24] = "app_chat.js";

static void stub_input(const NimoEvent* ev) {
  if (press_btn(ev, BTN_BACK) || press_btn(ev, BTN_OK)) nimo_os_pop();
}

static void stub_draw() {
  ui_header(stubTitle);
  display_text(2, 18, "Logika w JS:", 1);
  display_text(2, 28, stubFile, 1);
  display_text(2, 40, "Przepisz 1:1", 1);
  display_text(2, 48, "na ten szkic.", 1);
  ui_footer("OK / wstecz");
}

static NimoApp STUB = {"stub", nullptr, nullptr, stub_input, nullptr, stub_draw, nullptr};

NimoApp* app_stub(const char* id) {
  if (!id) id = "app";
  strncpy(stubTitle, id, sizeof(stubTitle) - 1);
  stubTitle[sizeof(stubTitle) - 1] = 0;
  snprintf(stubFile, sizeof(stubFile), "app_%s.js", id);
  STUB.id = id;
  return &STUB;
}
