#include "nimo_display.h"
#include "nimo_font.h"

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

static Adafruit_SSD1306* g_oled = nullptr;

void nimo_display_begin(Adafruit_SSD1306* oled) { g_oled = oled; }

void display_clear() {
  if (g_oled) g_oled->clearDisplay();
}

void display_pixel(int x, int y, int c) {
  if (!g_oled) return;
  if (x < 0 || y < 0 || x >= 128 || y >= 64) return;
  g_oled->drawPixel(x, y, c ? SSD1306_WHITE : SSD1306_BLACK);
}

void display_fill_rect(int x, int y, int w, int h, int c) {
  for (int yy = 0; yy < h; yy++) {
    for (int xx = 0; xx < w; xx++) display_pixel(x + xx, y + yy, c);
  }
}

void display_hline(int x, int y, int w, int c) {
  for (int i = 0; i < w; i++) display_pixel(x + i, y, c);
}

void display_vline(int x, int y, int h, int c) {
  for (int i = 0; i < h; i++) display_pixel(x, y + i, c);
}

void display_rect(int x, int y, int w, int h, int c) {
  if (w <= 0 || h <= 0) return;
  display_hline(x, y, w, c);
  display_hline(x, y + h - 1, w, c);
  display_vline(x, y, h, c);
  display_vline(x + w - 1, y, h, c);
}

static uint16_t utf8_next(const char** p) {
  const uint8_t c = (uint8_t)(*p)[0];
  if (c == 0) return 0;
  if (c < 0x80) {
    (*p)++;
    return c;
  }
  if ((c & 0xE0) == 0xC0 && (*p)[1]) {
    uint16_t cp = ((c & 0x1F) << 6) | ((*p)[1] & 0x3F);
    *p += 2;
    return cp;
  }
  if ((c & 0xF0) == 0xE0 && (*p)[1] && (*p)[2]) {
    uint16_t cp = ((c & 0x0F) << 12) | (((*p)[1] & 0x3F) << 6) | ((*p)[2] & 0x3F);
    *p += 3;
    return cp;
  }
  (*p)++;
  return '?';
}

const uint8_t* nimo_font_cols(uint16_t cp) {
  if (cp >= 32 && cp <= 126) return NIMO_FONT_ASCII[cp - 32];
  for (int i = 0; i < NIMO_FONT_EXTRA_COUNT; i++) {
    if (NIMO_FONT_EXTRA[i].cp == cp) return NIMO_FONT_EXTRA[i].col;
  }
  return nullptr;
}

static void draw_glyph(int x, int y, const uint8_t* cols, int color) {
  if (!cols) {
    display_rect(x, y, 5, 7, color);
    return;
  }
  for (int c = 0; c < 5; c++) {
    uint8_t bits = cols[c];
    for (int r = 0; r < 7; r++) {
      if (bits & (1 << r)) display_pixel(x + c, y + r, color);
    }
  }
}

void display_text(int x, int y, const char* str, int color) {
  if (!str) return;
  const char* p = str;
  while (*p) {
    uint16_t cp = utf8_next(&p);
    if (!cp) break;
    draw_glyph(x, y, nimo_font_cols(cp), color);
    x += 6;
  }
}

int text_width(const char* str) {
  if (!str || !str[0]) return 0;
  int n = 0;
  const char* p = str;
  while (*p) {
    if (!utf8_next(&p)) break;
    n++;
  }
  return n * 6 - 1;
}

void display_text_center(int y, const char* str) {
  int x = (128 - text_width(str)) / 2;
  if (x < 0) x = 0;
  display_text(x, y, str, 1);
}

void display_flush() {
  if (g_oled) g_oled->display();
}

void display_set_contrast(uint8_t contrast) {
  if (!g_oled) return;
  g_oled->ssd1306_command(SSD1306_SETCONTRAST);
  g_oled->ssd1306_command(contrast);
}

void display_scroll(int dir) {
  if (!g_oled) return;
  g_oled->ssd1306_command(0x2E);
  if (dir <= 0) return;
  if (dir == 3) {
    g_oled->ssd1306_command(0xA3);
    g_oled->ssd1306_command(0x00);
    g_oled->ssd1306_command(64);
    g_oled->ssd1306_command(0x29);
    g_oled->ssd1306_command(0x00);
    g_oled->ssd1306_command(0x00);
    g_oled->ssd1306_command(0x00);
    g_oled->ssd1306_command(0x07);
    g_oled->ssd1306_command(0x01);
  } else {
    g_oled->ssd1306_command(dir == 1 ? 0x27 : 0x26);
    g_oled->ssd1306_command(0x00);
    g_oled->ssd1306_command(0x00);
    g_oled->ssd1306_command(0x00);
    g_oled->ssd1306_command(0x07);
    g_oled->ssd1306_command(0x00);
    g_oled->ssd1306_command(0xFF);
  }
  g_oled->ssd1306_command(0x2F);
}

void display_fx(int mode) {
  if (!g_oled) return;
  g_oled->ssd1306_command(0x23);
  if (mode == 1) g_oled->ssd1306_command(0x20);
  else if (mode == 2) g_oled->ssd1306_command(0x30);
  else g_oled->ssd1306_command(0x00);
}

void display_all_on(int on) {
  if (!g_oled) return;
  g_oled->ssd1306_command(on ? 0xA5 : 0xA4);
}

void display_flip(int on) {
  if (!g_oled) return;
  g_oled->ssd1306_command(on ? 0xA0 : 0xA1);
  g_oled->ssd1306_command(on ? 0xC0 : 0xC8);
}
