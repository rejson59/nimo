/**
 * Ciche powiadomienia. Nie ma tu dzwonka na cały ekran —
 * pulpit pokazuje liczbę, panel „Alerty” listę.
 * Na ESP32 to byłby ten sam przegląd flag (unread, bateria, samouczek).
 */

import { battery_pct } from "./nimo_ui.js";

export function notes_collect(os) {
  const out = [];
  const chat = os.chat || [];
  for (let i = 0; i < chat.length; i++) {
    const c = chat[i];
    if (!c.unread) continue;
    const last = c.messages && c.messages.length ? c.messages[c.messages.length - 1].text : "";
    out.push({
      key: "c:" + c.id,
      app: "chat",
      contact: c.id,
      title: c.name,
      body: last || "nowa",
    });
  }
  if (os.settings && !os.settings.tutorial_done) {
    out.push({
      key: "tut",
      app: "tutorial",
      title: "Samouczek",
      body: "4 przyciski",
    });
  }
  const bat = battery_pct(os);
  if (bat <= 20) {
    out.push({
      key: "bat",
      app: "",
      title: "Bateria",
      body: bat + "%",
    });
  }
  return out;
}

export function notes_count(os) {
  return notes_collect(os).length;
}
