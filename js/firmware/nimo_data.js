/**
 * Dane trwałe. Na ESP32 to NVS / Preferences, tu platforma serializuje JSON.
 * Flagi są 0/1, nie boolean — bliżej C++.
 */

export const DEFAULT_SETTINGS = {
  contrast: 255,
  sound: 1,
  color: 0,
  tutorial_done: 0,
  snake_best: 0,
  memory_best: 0,
  react_best: 0,
};

export function chat_seed() {
  return [
    {
      id: "ada",
      name: "Ada",
      unread: 1,
      messages: [
        { me: 0, text: "Hej, odpalasz nimo?" },
        { me: 0, text: "Ekran już żyje?" },
      ],
    },
    {
      id: "leon",
      name: "Leon",
      unread: 0,
      messages: [{ me: 0, text: "W Snake nie zawracaj." }],
    },
    {
      id: "hub",
      name: "Warsztat",
      unread: 1,
      messages: [
        { me: 1, text: "Odpalam poligon." },
        { me: 0, text: "Powodzenia. Testuj." },
      ],
    },
  ];
}

export function normalize_settings(raw) {
  const s = Object.assign({}, DEFAULT_SETTINGS, raw || {});
  s.sound = s.sound ? 1 : 0;
  s.tutorial_done = s.tutorial_done ? 1 : 0;
  s.color = Math.max(0, Math.min(3, s.color | 0));
  s.contrast = Math.max(1, Math.min(255, s.contrast | 0));
  s.snake_best = Math.max(0, s.snake_best | 0);
  s.memory_best = Math.max(0, s.memory_best | 0);
  s.react_best = Math.max(0, s.react_best | 0);
  return s;
}

export function pad_seed() {
  return [
    { text: "Wgrać firmware", done: 0 },
    { text: "Sprawdzić piny", done: 0 },
    { text: "Naładować", done: 0 },
  ];
}

export function pad_load(raw) {
  if (!Array.isArray(raw)) return pad_seed();
  const out = [];
  for (let i = 0; i < raw.length && out.length < 8; i++) {
    const text = String((raw[i] && raw[i].text) || "").slice(0, 18);
    if (!text) continue;
    out.push({ text, done: raw[i].done ? 1 : 0 });
  }
  return out;
}
