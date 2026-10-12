/*
 * nimo os — szkic startowy ESP32 + OLED SSD1306 128x64.
 *
 * Biblioteki (Arduino Library Manager):
 *   Adafruit SSD1306
 *   Adafruit GFX Library
 *
 * Przyciski do masy, od góry:
 *   GPIO 32  góra
 *   GPIO 33  dół
 *   GPIO 25  OK
 *   GPIO 26  wstecz
 * OLED I2C: SDA 21, SCL 22, adres 0x3C
 *
 * Pełna logika menu, czatu, Snake i samouczka jest w js/firmware
 * i działa w symulatorze. Ten szkic ma ten sam stos ekranów i menu główne.
 * Kolejne aplikacje przepisuj plik po pliku — patrz README.
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include "nimo_config.h"
#include "nimo_display.h"
#include "nimo_input.h"
#include "nimo_os.h"
#include "app_home.h"

Adafruit_SSD1306 oled(NIMO_W, NIMO_H, &Wire, -1);

static void launch(const char* id, const char* how) {
  NimoApp* app = nullptr;
  if (strcmp(id, "home") == 0) app = app_home();
  else if (strcmp(id, "sleep") == 0) {
    // Uśpienie na płytce: zgaś panel. Tu wracamy od razu do menu.
    nimo_os_pop();
    return;
  } else {
    app = app_stub(id);
  }
  if (!app) return;
  if (how && strcmp(how, "replace") == 0) nimo_os_replace(app);
  else nimo_os_push(app);
}

void setup() {
  Wire.begin(21, 22);
  if (!oled.begin(SSD1306_SWITCHCAPVCC, NIMO_OLED_ADDR)) {
    while (true) delay(100);
  }
  oled.setContrast(255);
  nimo_display_begin(&oled);
  nimo_input_begin();
  nimo_os_init();
  nimo_launch = launch;
  nimo_os_push(app_home());
}

void loop() {
  uint32_t now = millis();
  nimo_input_scan(now);
  nimo_os_frame(now);
}
