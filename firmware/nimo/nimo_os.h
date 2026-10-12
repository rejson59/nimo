#pragma once
#include "nimo_config.h"

// Stos ekranów. Odpowiednik js/firmware/nimo_os.js.
// Aplikacja to zestaw wskaźników na funkcje — łatwo dodać kolejny plik .cpp.

struct NimoApp {
  const char* id;
  void (*on_enter)();
  void (*on_exit)();
  void (*on_input)(const NimoEvent* ev);
  void (*on_tick)(uint32_t dt_ms);
  void (*on_draw)();
  void (*on_resume)();
};

void nimo_os_init();
void nimo_os_push(NimoApp* app);
void nimo_os_replace(NimoApp* app);
void nimo_os_pop();
NimoApp* nimo_os_top();
void nimo_os_frame(uint32_t now);

// Ustawiane przez szkic, zanim poleci pierwsza klatka.
extern void (*nimo_launch)(const char* id, const char* how);
void nimo_os_launch(const char* id, const char* how);
