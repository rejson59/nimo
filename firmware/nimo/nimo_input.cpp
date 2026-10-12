#include "nimo_input.h"
#include <Arduino.h>

static const int PINS[BTN_COUNT] = {
  NIMO_PIN_UP, NIMO_PIN_DOWN, NIMO_PIN_OK, NIMO_PIN_BACK
};

struct Hold {
  bool down;
  bool longFired;
  uint32_t t;
  uint32_t lastRepeat;
  uint8_t repeats;
  uint32_t debounceAt;
  bool raw;
};

static Hold holds[BTN_COUNT];
static NimoEvent queue[12];
static uint8_t qh = 0;
static uint8_t qt = 0;

static void push_ev(uint8_t type, uint8_t button, uint32_t now) {
  uint8_t next = (qt + 1) % 12;
  if (next == qh) return;
  queue[qt] = {type, button, now};
  qt = next;
}

void nimo_input_begin() {
  for (int i = 0; i < BTN_COUNT; i++) {
    pinMode(PINS[i], INPUT_PULLUP);
    holds[i] = {};
    holds[i].raw = digitalRead(PINS[i]) == LOW;
  }
}

void nimo_input_scan(uint32_t now) {
  for (int b = 0; b < BTN_COUNT; b++) {
    bool raw = digitalRead(PINS[b]) == LOW;
    Hold& h = holds[b];
    if (raw != h.raw) {
      h.raw = raw;
      h.debounceAt = now;
    }
    bool stable = (now - h.debounceAt) >= NIMO_DEBOUNCE_MS;
    if (!stable) continue;

    if (raw && !h.down) {
      h.down = true;
      h.longFired = false;
      h.repeats = 0;
      h.t = now;
      h.lastRepeat = now;
      push_ev(EV_PRESS, b, now);
    } else if (!raw && h.down) {
      h.down = false;
      push_ev(EV_RELEASE, b, now);
      if (!h.longFired) push_ev(EV_TAP, b, now);
    } else if (h.down) {
      if (!h.longFired && now - h.t >= NIMO_LONG_MS) {
        h.longFired = true;
        push_ev(EV_LONG, b, now);
      }
      uint32_t wait = h.repeats >= NIMO_REPEAT_FAST_AFTER ? NIMO_REPEAT_FAST_MS : NIMO_REPEAT_MS;
      if (now - h.t >= NIMO_REPEAT_DELAY_MS && now - h.lastRepeat >= wait) {
        h.lastRepeat = now;
        h.repeats++;
        push_ev(EV_REPEAT, b, now);
      }
    }
  }
}

bool nimo_input_poll(NimoEvent* out) {
  if (qh == qt) return false;
  *out = queue[qh];
  qh = (qh + 1) % 12;
  return true;
}
