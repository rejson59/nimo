#include "nimo_os.h"
#include "nimo_display.h"
#include "nimo_input.h"

static NimoApp* stack[6];
static uint8_t depth = 0;
static uint32_t lastMs = 0;
static int8_t muteButton = -1;
static int8_t eventButton = -1;

void (*nimo_launch)(const char* id, const char* how) = nullptr;

void nimo_os_init() {
  depth = 0;
  lastMs = 0;
  muteButton = -1;
  eventButton = -1;
}

NimoApp* nimo_os_top() {
  return depth ? stack[depth - 1] : nullptr;
}

static void note_transition() {
  if (eventButton >= 0) muteButton = eventButton;
}

void nimo_os_push(NimoApp* app) {
  if (!app || depth >= 6) return;
  stack[depth++] = app;
  note_transition();
  if (app->on_enter) app->on_enter();
}

void nimo_os_replace(NimoApp* app) {
  if (!app) return;
  if (depth) {
    NimoApp* cur = stack[--depth];
    if (cur->on_exit) cur->on_exit();
  }
  stack[depth++] = app;
  note_transition();
  if (app->on_enter) app->on_enter();
}

void nimo_os_pop() {
  if (depth <= 1) return;
  NimoApp* cur = stack[--depth];
  if (cur->on_exit) cur->on_exit();
  note_transition();
  NimoApp* top = nimo_os_top();
  if (top && top->on_resume) top->on_resume();
}

void nimo_os_launch(const char* id, const char* how) {
  if (nimo_launch) nimo_launch(id, how);
}

void nimo_os_frame(uint32_t now) {
  if (!lastMs) lastMs = now;
  uint32_t dt = now - lastMs;
  if (dt > 250) dt = 16;
  lastMs = now;

  NimoEvent ev;
  while (nimo_input_poll(&ev)) {
    if (muteButton == (int8_t)ev.button) {
      if (ev.type == EV_RELEASE) muteButton = -1;
      continue;
    }
    eventButton = ev.button;
    NimoApp* top = nimo_os_top();
    if (top && top->on_input) top->on_input(&ev);
  }

  NimoApp* top = nimo_os_top();
  if (top && top->on_tick) top->on_tick(dt);
  display_clear();
  if (top && top->on_draw) top->on_draw();
  display_flush();
}
