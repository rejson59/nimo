/**
 * Słownik zdarzeń wejścia. Skaner GPIO jest po stronie platformy
 * (js/platform/input_web.js albo firmware/nimo/nimo_input.cpp).
 *
 * Krótkie kliknięcie: PRESS (wciśnięcie) + RELEASE + TAP (puszczenie bez LONG).
 * Przytrzymanie: PRESS, potem LONG, na końcu RELEASE (bez TAP).
 * Menu reaguje na PRESS/REPEAT. Tam, gdzie LONG znaczy coś innego niż PRESS
 * (pisanie, lewo w Snake), aplikacja słucha TAP i LONG, nie PRESS.
 */

import {
  BTN_UP,
  BTN_DOWN,
  EV_PRESS,
  EV_REPEAT,
  EV_TAP,
  EV_LONG,
} from "./nimo_config.js";

export function nav_delta(ev) {
  if (ev.type !== EV_PRESS && ev.type !== EV_REPEAT) return 0;
  if (ev.button === BTN_UP) return -1;
  if (ev.button === BTN_DOWN) return 1;
  return 0;
}

export function press(ev, btn) {
  return ev.type === EV_PRESS && ev.button === btn;
}

export function tap(ev, btn) {
  return ev.type === EV_TAP && ev.button === btn;
}

export function long(ev, btn) {
  return ev.type === EV_LONG && ev.button === btn;
}

export function press_or_repeat(ev, btn) {
  return (ev.type === EV_PRESS || ev.type === EV_REPEAT) && ev.button === btn;
}
