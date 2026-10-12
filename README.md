# nimo

Symulator miniaturowego urządzenia: ESP32 i OLED 0.96" (128×64). Poligon firmware, zanim kod trafi na układ.

Ekran w przeglądarce to ten sam bufor 1-bit, który na płytce pójdzie do SSD1306. Na telefonie szkło jest w skali 1:1 (21.7 × 10.9 mm). Na komputerze jest powiększone całkowitoliczbowo, bo prawdziwy panel ledwo widać. Logika menu nie zna DOM, canvasu ani `localStorage`.

## Uruchomienie

Potrzebny jest zwykły serwer statyczny (moduły ES nie działają z `file://`):

```bash
python3 -m http.server 8080
```

Otwórz `http://localhost:8080`.

## Przyciski

Cztery, po prawej ekranu, jeden pod drugim. Na komputerze działają też klawisze.

| Przycisk | Klawisz | Menu | Snake | Pisanie |
| --- | --- | --- | --- | --- |
| ▲ góra | ↑ | wyżej | góra | poprzedni znak |
| ▼ dół | ↓ | niżej | dół | następny znak |
| ● OK | Enter | wejdź / zatwierdź | prawo | wstaw, przytrzymaj: wyślij |
| ◄ wstecz | Esc / Backspace | wróć, na pulpicie: uśpij | lewo po puszczeniu, przytrzymaj: pauza | kasuj |

Przytrzymanie trwa około pół sekundy — na obudowie widać pierścień. Długie ◄ pomija samouczek i wychodzi z aplikacji.

Samouczek startuje przy pierwszym wejściu. ◄ na pierwszym ekranie pyta, zanim go pominie. Wrócisz do niego z Ustawień.

Na pulpicie są dwie strony ikon: Czat, Gierki, Narzędzia, Alerty, a dalej Lista, Zegar, Latarka i Ustawienia. Minutnik liczy się też po wyjściu z ekranu.

W Ustawieniach jest Wygląd: Cichy, Noc, Bursztyn, Moduł i Papier. Wybór zmienia szkło i stronę od razu. Barwa pikseli zostaje osobno, jeśli chcesz tylko odcień.

## Architektura

```
js/firmware/     logika do przepisania na C++ (bez przeglądarki)
js/platform/     canvas, klawiatura, dźwięk, localStorage
firmware/nimo/   szkic Arduino IDE — ten sam stos ekranów
```

Aplikacja to `on_enter` / `on_input` / `on_tick` / `on_draw`. Czas liczy się z `dt`, nie z `setTimeout`. Zapis idzie przez HAL (`storage_get` / `storage_set`) — w przeglądarce to NVS w `localStorage`, na ESP32 będzie Preferences.

Szczegóły przenosin: [firmware/nimo/README.md](firmware/nimo/README.md).

## GitHub Pages

Ścieżki są względne, więc strona może wisieć w katalogu głównym repozytorium (`/`) albo pod `/nimo/`. Wystarczy włączyć Pages z gałęzi, na której leży `index.html`.
