/**
 * Rejestr aplikacji. Aplikacje wołają os_launch("chat"), nie importują się
 * nawzajem — ten plik jest jedynym miejscem, które zna wszystkie ekrany.
 * W C++ to tablica const NimoApp*.
 */

import { os, os_push, os_replace } from "./nimo_os.js";
import { app_about } from "./apps/app_about.js";
import { app_boot } from "./apps/app_boot.js";
import { app_chat } from "./apps/app_chat.js";
import { app_games } from "./apps/app_games.js";
import { app_home } from "./apps/app_home.js";
import { app_memory } from "./apps/app_memory.js";
import { app_settings } from "./apps/app_settings.js";
import { app_sleep } from "./apps/app_sleep.js";
import { app_snake } from "./apps/app_snake.js";
import { app_tutorial } from "./apps/app_tutorial.js";

const TABLE = {
  about: app_about,
  boot: app_boot,
  chat: app_chat,
  games: app_games,
  home: app_home,
  memory: app_memory,
  settings: app_settings,
  sleep: app_sleep,
  snake: app_snake,
  tutorial: app_tutorial,
};

export function launch(id, how = "push") {
  const app = TABLE[id];
  if (!app) return;
  if (how === "replace") os_replace(app);
  else os_push(app);
}

os.open = launch;

export function app_ids() {
  return Object.keys(TABLE);
}
