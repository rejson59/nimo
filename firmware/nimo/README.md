# nimo na ESP32

Szkic startowy pod Arduino IDE. Symulator w katalogu głównym repozytorium jest wzorcem zachowania — ten folder ma ten sam kształt, żeby przepisywanie było mechaniczne.

## Biblioteki

W Arduino Library Manager:

- Adafruit SSD1306
- Adafruit GFX Library

Otwórz `nimo.ino`. Wszystkie pliki `.cpp` muszą leżeć obok szkicu (Arduino IDE nie kompiluje podkatalogów).

## Okablowanie

| Sygnał | GPIO | Uwaga |
| --- | --- | --- |
| ▲ góra | 32 | do masy, `INPUT_PULLUP` |
| ▼ dół | 33 | do masy, `INPUT_PULLUP` |
| ● OK | 25 | do masy, `INPUT_PULLUP` |
| ◄ wstecz | 26 | do masy, `INPUT_PULLUP` |
| SDA | 21 | OLED I2C |
| SCL | 22 | OLED I2C |
| adres | 0x3C | SSD1306 128×64 |

Piny są w `nimo_config.h`.

## Co już działa na płytce

Menu główne, pytanie o uśpienie i stos ekranów. W symulatorze pulpit to siatka ikon (Czat, Gierki, Ustawienia, Alerty); ten szkic ma jeszcze listę tekstową trzech pozycji. Wejście w Czat / Gierki / Ustawienia pokazuje, który plik JS przepisać. Samouczek, czat, Snake, Pamięć i panel alertów są w symulatorze — przenieś je, gdy menu na prawdziwym OLED wygląda tak samo.

## Jak przepisywać aplikację

1. Otwórz `js/firmware/apps/app_snake.js` (albo inny).
2. Zostaw maszynę stanów: `on_enter`, `on_input`, `on_tick`, `on_draw`.
3. Zamień `display_*` i `ui_*` na funkcje z `nimo_display.h` / `nimo_ui.h` — nazwy są te same.
4. Czas bierz z `dt` w `on_tick`, nie z `setTimeout`.
5. Przycisk, który ma inne znaczenie przy przytrzymaniu (lewo w Snake, wysłanie w czacie), obsługuj jako `EV_TAP` i `EV_LONG`, nie jako `EV_PRESS`.
6. Po `nimo_os_push` / `pop` zdarzenia tego samego przycisku są połykane aż do puszczenia — tak jak w JS.

Zdarzenia i czasy (`520 ms` long, `360 ms` zanim powtórka) są wspólne z symulatorem.
