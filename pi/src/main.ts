/** Entry point: start the panel driver, the display loop and the web server. */

import { createServer } from "node:http";
import { join } from "node:path";

import { Pet } from "../../core/src/pet";
import { PetScene } from "../../core/src/scene";
import { readAssets } from "./assets";
import {
  APP_BUNDLE_DIR, APP_DIR, BDF_FONT_DIR, DATA_DIR, DRIVER_FILE, LOCALE_DIR, PET_ASIDE_FILE, PET_FILE, PYTHON, SETTINGS_FILE, STATE_FILE,
  TEMPLATE_DIR, loadConfig,
} from "./config";
import { Display } from "./display";
import { getLog } from "./log";
import { startPanel } from "./panel";
import { Settings, followLocation } from "./settings";
import { Updates } from "./update";
import { loadPet, petSaver, readLocales } from "./storage";
import { Weather } from "../../core/src/weather";
import { createApp } from "./web";

const log = getLog("led-matrix");

async function main(): Promise<void> {
  const cfg = loadConfig();
  const settings = new Settings(SETTINGS_FILE, cfg, readLocales(LOCALE_DIR));
  const location = settings.location;
  const weather = new Weather(location?.[0] ?? null, location?.[1] ?? null, cfg.weatherRefreshMinutes, undefined,
    getLog("weather").warning);
  if (!weather.configured) {
    log.warning("No location set (settings page or config.ini) – running without weather, sun times are estimated");
  }
  const assets = readAssets(BDF_FONT_DIR);
  if (!assets.font) {
    log.warning(`No panel font in ${BDF_FONT_DIR} – the scene has no clock and no temperature`);
  }

  const pet = new Pet({
    t: settings.t, saved: loadPet(PET_FILE), save: petSaver(PET_FILE), weather: () => weather.current(),
    location,
    log: (message, error) => log.error(message, error),
  });
  const panel = await startPanel(PYTHON, DRIVER_FILE, cfg);
  const scene = (): PetScene => new PetScene(cfg.cols, cfg.rows, assets, { location: settings.location });
  const display = new Display({ panel, pet, weather, scene, defaultBrightness: cfg.brightness, stateFile: STATE_FILE });
  followLocation(settings, { weather, pet, display });
  pet.setBedtimeSource(display.bedtime);
  display.start();

  // Without the panel there is nothing to show: end, and systemd starts the service again.
  let stopping = false;
  void panel?.exited.then((why) => {
    if (stopping) {
      return;
    }
    log.error(`The panel driver has stopped (${why})`);
    pet.save();
    process.exit(1);
  });
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      stopping = true;
      pet.save();
      display.stop();
      // the driver clears the panel on its way out
      void Promise.race([panel?.close(), new Promise((resolve) => setTimeout(resolve, 2000))])
        .then(() => process.exit(0));
    });
  }

  // Look for a new release a minute after the start and then every six hours; while an update
  // runs, watch its unit (it ends by restarting this service, or fails).
  // VERSION and REPO lie next to the app (WorkingDirectory); the update unit reads update.env
  const updates = new Updates(".", fetch, undefined, () => cfg.updateBetas, join(DATA_DIR, "update.env"));
  if (updates.enabled) {
    setTimeout(() => void updates.check(), 60_000);
    setInterval(() => void updates.check(), 6 * 3600_000);
    setInterval(() => void (updates.state().running && updates.checkUnit()), 10_000);
  }

  const app = createApp({ display, weather, pet, settings, updates, assets, keepAside: petSaver(PET_ASIDE_FILE),
    templateDir: TEMPLATE_DIR, appDir: APP_DIR, bundleDir: APP_BUNDLE_DIR });
  const port = Number(process.env.LED_MATRIX_PORT ?? cfg.port);
  // All interfaces, IPv4 and IPv6; the app itself turns away anything from outside the home
  // network (network.ts).
  createServer(app).listen(port, () => log.info(`Web interface on port ${port}`));
}

main().catch((error) => {
  log.error("Could not start", error);
  process.exit(1);
});
