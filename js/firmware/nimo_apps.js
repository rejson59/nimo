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
import { app_clock } from "./apps/app_clock.js";
import { app_memory } from "./apps/app_memory.js";
import { app_pad } from "./apps/app_pad.js";
import { app_panel } from "./apps/app_panel.js";
import { app_react } from "./apps/app_react.js";
import { app_settings } from "./apps/app_settings.js";
import { app_sleep } from "./apps/app_sleep.js";
import { app_snake } from "./apps/app_snake.js";
import { app_tools } from "./apps/app_tools.js";
import { app_torch } from "./apps/app_torch.js";
import { app_tutorial } from "./apps/app_tutorial.js";

const TABLE = {
  about: app_about,
  boot: app_boot,
  chat: app_chat,
  games: app_games,
  home: app_home,
  clock: app_clock,
  memory: app_memory,
  pad: app_pad,
  panel: app_panel,
  react: app_react,
  settings: app_settings,
  sleep: app_sleep,
  snake: app_snake,
  tools: app_tools,
  torch: app_torch,
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
