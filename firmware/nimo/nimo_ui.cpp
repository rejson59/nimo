#include "nimo_ui.h"
#include "nimo_display.h"

void ui_header(const char* title) {
  display_text(1, 0, title, 1);
  display_hline(0, 8, 128, 1);
}

void ui_footer(const char* hint) {
  display_hline(0, 55, 128, 1);
  display_text(1, 57, hint, 1);
}

void menu_move(NimoMenu* menu, int dir, uint8_t win) {
  if (!menu || !menu->count) return;
  int n = menu->count;
  int sel = (int)menu->sel + (dir > 0 ? 1 : -1);
  if (sel < 0) sel = n - 1;
  if (sel >= n) sel = 0;
  menu->sel = (uint8_t)sel;
  if (win < 1) win = 1;
  if (menu->sel < menu->top) menu->top = menu->sel;
  if (menu->sel >= menu->top + win) menu->top = menu->sel - win + 1;
}

void menu_draw(NimoMenu* menu, int x, int y, int w, int h, int itemH) {
  if (!menu) return;
  int win = h / itemH;
  if (win < 1) win = 1;
  for (int i = 0; i < win && menu->top + i < menu->count; i++) {
    int idx = menu->top + i;
    int iy = y + i * itemH;
    bool on = idx == menu->sel;
    if (on) display_fill_rect(x, iy, w, itemH - 1, 1);
    display_text(x + 4, iy + (itemH - 8) / 2, menu->items[idx].label, on ? 0 : 1);
  }
}

void dialog_draw(const char* title, const char* const* options, uint8_t count, uint8_t sel) {
  int w = 112;
  int h = 16 + count * 12 + 6;
  int x = (128 - w) / 2;
  int y = (64 - h) / 2;
  display_fill_rect(0, 9, 128, 55, 0);
  display_rect(x, y, w, h, 1);
  display_text(x + 5, y + 3, title, 1);
  for (uint8_t i = 0; i < count; i++) {
    int iy = y + 14 + i * 12;
    if (i == sel) display_fill_rect(x + 4, iy - 1, w - 8, 10, 1);
    display_text(x + 7, iy, options[i], i == sel ? 0 : 1);
  }
}

int nav_delta(const NimoEvent* ev) {
  if (!ev) return 0;
  if (ev->type != EV_PRESS && ev->type != EV_REPEAT) return 0;
  if (ev->button == BTN_UP) return -1;
  if (ev->button == BTN_DOWN) return 1;
  return 0;
}

bool press_btn(const NimoEvent* ev, uint8_t button) {
  return ev && ev->type == EV_PRESS && ev->button == button;
}
