#pragma once
#include "nimo_config.h"
#include <stdint.h>

// Widżety 1-bit. Ta sama geometria co js/firmware/nimo_ui.js.

struct NimoMenuItem {
  const char* id;
  const char* label;
};

struct NimoMenu {
  const NimoMenuItem* items;
  uint8_t count;
  uint8_t sel;
  uint8_t top;
};

void ui_header(const char* title);
void ui_footer(const char* hint);
void menu_move(NimoMenu* menu, int dir, uint8_t win);
void menu_draw(NimoMenu* menu, int x, int y, int w, int h, int itemH);
void dialog_draw(const char* title, const char* const* options, uint8_t count, uint8_t sel);

int nav_delta(const NimoEvent* ev);
bool press_btn(const NimoEvent* ev, uint8_t button);
