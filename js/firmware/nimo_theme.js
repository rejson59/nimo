/**
 * Wyglądy interfejsu. Firmware trzyma numer i sposób zaznaczenia.
 * Barwę pikseli i ramkę strony dokłada platforma — na ESP32 kolor jest
 * cechą modułu, a invert to komenda SSD1306 (0xA6 / 0xA7).
 *
 * mark 0 = pełne zaznaczenie, 1 = sama ramka (ciszej).
 */

export const THEMES = [
  { id: 0, name: "Cichy", blurb: "ciepła biel", color: 0, invert: 0, mark: 0 },
  { id: 1, name: "Noc", blurb: "zimny błękit", color: 1, invert: 0, mark: 1 },
  { id: 2, name: "Bursztyn", blurb: "żółte szkło", color: 2, invert: 0, mark: 0 },
  { id: 3, name: "Moduł", blurb: "pasek Y/B", color: 3, invert: 0, mark: 0 },
  { id: 4, name: "Papier", blurb: "jasne tło", color: 0, invert: 1, mark: 1 },
];

let current = THEMES[0];

export function theme_of(os) {
  const i = os && os.settings ? os.settings.theme | 0 : 0;
  return THEMES[i] || THEMES[0];
}

export function theme_use(os) {
  current = theme_of(os);
  return current;
}

export function theme_mark() {
  return current.mark | 0;
}

export function theme_apply(os, index) {
  const t = THEMES[index] || THEMES[0];
  os.settings.theme = t.id;
  os.settings.color = t.color;
  os.settings.invert = t.invert;
  if (os.platform && os.platform.set_pixel_color) os.platform.set_pixel_color(t.color);
  theme_use(os);
  return t;
}
