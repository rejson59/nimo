#pragma once
#include <stdint.h>

// Te same liczby co js/firmware/nimo_config.js.
// Przyciski, od góry: góra, dół, OK, wstecz.

static const int NIMO_W = 128;
static const int NIMO_H = 64;
static const char NIMO_VERSION[] = "0.1.0";

enum NimoButton : uint8_t {
  BTN_UP = 0,
  BTN_DOWN = 1,
  BTN_OK = 2,
  BTN_BACK = 3,
  BTN_COUNT = 4
};

enum NimoEventType : uint8_t {
  EV_PRESS = 1,
  EV_RELEASE = 2,
  EV_REPEAT = 3,
  EV_LONG = 4,
  EV_TAP = 5
};

struct NimoEvent {
  uint8_t type;
  uint8_t button;
  uint32_t now;
};

static const uint32_t NIMO_LONG_MS = 520;
static const uint32_t NIMO_REPEAT_DELAY_MS = 360;
static const uint32_t NIMO_REPEAT_MS = 78;
static const uint32_t NIMO_REPEAT_FAST_MS = 40;
static const uint8_t NIMO_REPEAT_FAST_AFTER = 5;
static const uint32_t NIMO_DEBOUNCE_MS = 20;

// Aktywne LOW, wewnętrzne pull-up. Zmień, jeśli płytka ma inne GPIO.
static const int NIMO_PIN_UP = 32;
static const int NIMO_PIN_DOWN = 33;
static const int NIMO_PIN_OK = 25;
static const int NIMO_PIN_BACK = 26;
static const uint8_t NIMO_OLED_ADDR = 0x3C;
