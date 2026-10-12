#pragma once
#include <stdint.h>

// Rysowanie 1-bit. Implementacja woła Adafruit_SSD1306.
// Odpowiednik: js/firmware/nimo_display.js

class Adafruit_SSD1306;

void nimo_display_begin(Adafruit_SSD1306* oled);
void display_clear();
void display_pixel(int x, int y, int c);
void display_fill_rect(int x, int y, int w, int h, int c);
void display_rect(int x, int y, int w, int h, int c);
void display_hline(int x, int y, int w, int c);
void display_vline(int x, int y, int h, int c);
void display_text(int x, int y, const char* str, int color = 1);
void display_text_center(int y, const char* str);
int text_width(const char* str);
void display_flush();
void display_set_contrast(uint8_t contrast);
// Komendy SSD1306/SSD1315. Nie ruszają bufora rysowania.
// dir: 0 stop, 1 lewo (0x27), 2 prawo (0x26), 3 skos (0x29).
void display_scroll(int dir);
// mode: 0 stop, 1 zanikanie, 2 mruganie (0x23).
void display_fx(int mode);
void display_all_on(int on);
void display_flip(int on);
