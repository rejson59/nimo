#pragma once
#include "nimo_config.h"

// Skaner GPIO. Po debounsie emituje te same zdarzenia co js/platform/input_web.js.
// Aplikacja nie czyta pinów — dostaje NimoEvent.

void nimo_input_begin();
void nimo_input_scan(uint32_t now);
bool nimo_input_poll(NimoEvent* out);
