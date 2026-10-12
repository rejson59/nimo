/**
 * Stałe nimo. Te same liczby są w firmware/nimo/nimo_config.h.
 * Przyciski: 0 góra, 1 dół, 2 OK, 3 wstecz — jeden pod drugim.
 */

export const NIMO_W = 128;
export const NIMO_H = 64;
export const NIMO_VERSION = "0.1.0";

export const BTN_UP = 0;
export const BTN_DOWN = 1;
export const BTN_OK = 2;
export const BTN_BACK = 3;
export const BTN_COUNT = 4;

export const EV_PRESS = 1;
export const EV_RELEASE = 2;
export const EV_REPEAT = 3;
export const EV_LONG = 4;
export const EV_TAP = 5;
export const EV_CHAR = 6;

/** Przytrzymanie, po którym leci EV_LONG (jeszcze przed puszczeniem). */
export const LONG_MS = 520;
/** Opóźnienie, zanim przytrzymany przycisk zacznie powtarzać. */
export const REPEAT_DELAY_MS = 360;
export const REPEAT_MS = 78;
export const REPEAT_FAST_MS = 40;
export const REPEAT_FAST_AFTER = 5;

export const BTN_NAME = ["up", "down", "ok", "back"];
export const EV_NAME = ["", "press", "release", "repeat", "long", "tap", "char"];

export const BEEP_CLICK = 1;
export const BEEP_BACK = 2;
export const BEEP_ERR = 3;
export const BEEP_EAT = 4;
export const BEEP_DIE = 5;
export const BEEP_OK = 6;
export const BEEP_M0 = 10;
export const BEEP_M1 = 11;
export const BEEP_M2 = 12;
export const BEEP_M3 = 13;

export const COLOR_WHITE = 0;
export const COLOR_BLUE = 1;
export const COLOR_YELLOW = 2;
export const COLOR_SPLIT = 3;
export const COLOR_NAME = ["biała", "nieb.", "żółta", "Y/B"];

/** Kroki kontrastu SSD1306 (0–255). Symulator ściemnia piksele, ESP32: SETCONTRAST. */
export const CONTRAST_STEPS = [28, 70, 120, 180, 255];
