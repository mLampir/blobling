/** Web interface and JSON API. */

import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";

import type { Image } from "../../core/src/image";
import * as life from "../../core/src/life";
import { NOT_A_PET_ROUTE, petRequest } from "../../core/src/api";
import { RequestError } from "../../core/src/model";
import { MAX_NAME, readSave, type Pet, type SaveFile } from "../../core/src/pet";
import { PetScene, type SceneAssets } from "../../core/src/scene";
import type { Display } from "./display";
import { getLog } from "./log";
import { isHomeNetwork } from "./network";
import { encodePng } from "./png";
import type { Settings } from "./settings";
import type { Updates } from "./update";
import type { Weather } from "../../core/src/weather";

const log = getLog("web");

const MAX_BODY = 64 * 1024; // small JSON requests only
const MAX_SAVE = 2 * 1024 * 1024; // a save file loaded on the settings page
const PREVIEW_WAIT = 1; // seconds the preview waits for the next frame at most
// background of the pet app, as "#111318"

// ---------- Pages ----------

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#34;", "'": "&#39;" };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** JSON that can stand inside a <script>. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&'\u2028\u2029]/g, (char) =>
    "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
}

/**
 * Fills in a page. The pages know three things: `{{ t('key') }}` is a text from the language
 * files, `{{ name }}` a value, and `{{ name|tojson }}` a value for the page's own script.
 */
export function renderPage(template: string, t: Settings["t"], values: Record<string, unknown>): string {
  return template.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, expression: string) => {
    const text = expression.match(/^t\((['"])([\w.]+)\1\)$/);
    if (text) {
      return escapeHtml(t(text[2]));
    }
    const value = expression.match(/^(\w+)(\|tojson)?$/);
    if (!value || !Object.hasOwn(values, value[1])) {
      throw new Error(`The page asks for {{ ${expression} }}, which is not known`);
    }
    return value[2] ? scriptJson(values[value[1]]) : escapeHtml(String(values[value[1]]));
  });
}

// ---------- Requests ----------

/** A request that is answered with nothing but a status (404, 413). */
class Refusal extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

function readBody(request: IncomingMessage, limit = MAX_BODY): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let chunks: Buffer[] | null = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        // the rest is read and dropped, so that the answer still gets through
        chunks = null;
        reject(new Refusal(413));
      }
      chunks?.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks ?? [])));
    request.on("error", reject);
  });
}

/** The JSON object a request carries; anything else counts as an empty one. */
async function readJson(request: IncomingMessage, limit = MAX_BODY): Promise<unknown> {
  try {
    return JSON.parse((await readBody(request, limit)).toString("utf-8"));
  } catch (error) {
    if (error instanceof Refusal) {
      throw error;
    }
    return null;
  }
}

function fields(body: unknown): Record<string, unknown> {
  return body !== null && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

export interface WebOptions {
  display: Display;
  weather: Weather;
  pet: Pet;
  /** Language and location, as the settings page sets them */
  settings: Settings;
  /** Updates from the releases (only on a Pi installed from one) */
  updates: Updates;
  /** Keeps the pet aside before a save file takes its place */
  keepAside: (save: SaveFile) => void;
  /** The sprite sheets, for the app icon. */
  assets: SceneAssets;
  templateDir: string;
  /** Where the app's page lies (app/pet.html) */
  appDir: string;
  /** Where the app's script was built to (dist/app/app.js) */
  bundleDir: string;
}

type Send = (status: number, body: string | Buffer, headers: Record<string, string>) => void;

/** The function that answers the requests of the web server. */
export function createApp(options: WebOptions): (request: IncomingMessage, response: ServerResponse) => void {
  const { display, weather, pet, settings, updates, keepAside, templateDir, appDir, bundleDir } = options;
  const t = settings.t;
  const templates = new Map<string, string>();
  const icons = new PetScene(64, 64, options.assets);
  let png: [Image, Buffer] | null = null; // the last frame of the preview, encoded

  /**
   * A page in the chosen language; `strings` is for the page's own script. While no language is
   * chosen, the browser's language is taken.
   */
  function page(request: IncomingMessage, name: string, values: Record<string, unknown> = {}): string {
    settings.adoptLanguage(request.headers["accept-language"]);
    const i18n = settings.i18n;
    let template = templates.get(name);
    if (template === undefined) {
      template = readFileSync(join(templateDir, name), "utf-8");
      templates.set(name, template);
    }
    return renderPage(template, t, { lang: i18n.language, strings: i18n.catalog, ...values });
  }

  // The app's page, in the language of the Pi (the texts of its answers are in that one too)
  let petHtml: string | null = null;
  const petPage = (): string => {
    petHtml ??= readFileSync(join(appDir, "pet.html"), "utf-8");
    return petHtml.replace(/<html lang="\w+">/, `<html lang="${settings.i18n.language}" data-host="pi">`);
  };

  const stateJson = () => {
    const s = display.state();
    return {
      mode: s.mode, brightness: s.brightness, night: s.night,
      night_active: display.nightActive(), weather_configured: weather.configured,
      language: settings.i18n.language, location: settings.location, update: updates.state(),
      // the pets at home, for pinning the camera to one of them; pinned: its id, or null
      pets: pet.pets.map((p) => ({ id: p.id, name: p.name, stage: p.stage, species: p.species })),
      camera: display.camera, pinned: s.pinned,
      // the pets phones took along, to fetch one back if its phone is lost
      away: pet.awayList(),
    };
  };

  async function handle(request: IncomingMessage, url: URL, send: Send): Promise<void> {
    const json = (value: unknown, type = "application/json"): void =>
      send(200, JSON.stringify(value), { "Content-Type": type });
    const html = (text: string): void => send(200, text, { "Content-Type": "text/html; charset=utf-8" });
    const route = `${request.method === "HEAD" ? "GET" : request.method} ${url.pathname}`;

    switch (route) {
      case "GET /":
        return html(page(request, "index.html", { languages: settings.languages() }));

      case "GET /api/state":
        return json(stateJson());

      case "POST /api/mode":
        display.setMode(fields(await readJson(request)).mode);
        return json(stateJson());

      case "POST /api/brightness": {
        const { value } = fields(await readJson(request));
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new RequestError("invalid_value");
        }
        display.setBrightness(value);
        return json(stateJson());
      }

      case "POST /api/pin":
        // the camera stays with one pet (its id), or follows the phones again (null)
        display.pin(fields(await readJson(request)).pet ?? null);
        return json(stateJson());

      case "POST /api/fetch_back": {
        // a pet a phone took along comes back without it; the phone's copy no longer counts
        const asked = fields(await readJson(request));
        if (asked.confirm !== true) {
          throw new RequestError("confirm");
        }
        display.petFetchBack(asked.pet);
        return json(stateJson());
      }

      case "POST /api/night":
        display.setNight(await readJson(request));
        return json(stateJson());

      case "POST /api/language":
        settings.setLanguage(fields(await readJson(request)).language);
        return json(stateJson());

      case "POST /api/location": {
        const { latitude, longitude } = fields(await readJson(request));
        settings.setLocation(latitude ?? null, longitude ?? null);
        return json(stateJson());
      }

      case "POST /api/update":
        // Takes nothing from the request: it only ever installs the newest release.
        if (!await updates.start()) {
          throw new RequestError("no_update");
        }
        return json(stateJson());

      case "GET /api/pet/save": {
        // The save file, to keep it somewhere else (settings page)
        const day = new Date().toISOString().slice(0, 10);
        return send(200, JSON.stringify(pet.toSave()), {
          "Content-Type": "application/json", "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="blobling-${day}.json"`,
        });
      }

      case "POST /api/pet/save": {
        // A save file in place of the current pet, which is kept aside once (settings page)
        let saved: ReturnType<typeof readSave>;
        try {
          saved = readSave(await readJson(request, MAX_SAVE));
        } catch (error) {
          if (error instanceof Refusal) {
            throw error;
          }
          throw new RequestError("not_a_save");
        }
        keepAside(pet.toSave());
        display.petReplace(saved);
        log.info(`Loaded pet ${saved.state.name} (${saved.state.stage}) from a save file`);
        return json(stateJson());
      }

      case "GET /preview.png": {
        // What the matrix is showing right now (for the live preview); with ?next, the frame after
        // that one, as soon as it is drawn (the app's scene, one frame after the other).
        // ?pet=: the frames of that pet, which the panel may not be showing
        const frame = await display.frameOf(url.searchParams.get("pet"), url.searchParams.has("next"), PREVIEW_WAIT);
        if (png?.[0] !== frame) {
          png = [frame, encodePng(frame)]; // encoded once, however many are watching
        }
        return send(200, png[1], { "Content-Type": "image/png", "Cache-Control": "no-store" });
      }

      // ---------- Pet ----------

      case "GET /pet":
        // The app's page (app/pet.html); data-host tells it that the Pi keeps its pet. While no
        // language is chosen, the browser's language is taken.
        settings.adoptLanguage(request.headers["accept-language"]);
        return html(petPage());

      case "GET /app.js":
        // The app's script (app/src/, built into dist/app/), for the page above
        return send(200, readFileSync(join(bundleDir, "app.js")),
          { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" });

      case "GET /pet-icon.png": {
        // App icon: the pet itself, scaled up (or a given form, for the ancestors' gallery).
        let stage = url.searchParams.get("stage") ?? "";
        let species = url.searchParams.get("species") ?? "";
        if (!(life.STAGES as readonly string[]).includes(stage) || !life.SPECIES.includes(species)) {
          ({ stage, species } = pet.snapshot());
        }
        const size = url.searchParams.get("size") === "512" ? 512 : 192;
        const icon = icons.icon(size, stage, species, url.searchParams.get("maskable") === "1");
        return send(200, encodePng(icon), { "Content-Type": "image/png", "Cache-Control": "max-age=600" });
      }

      default: {
        // The pet's own routes (/api/pet…), the same ones the app answers on the phone
        const answer = await petRequest(
          {
            pet, action: display.petAction.bind(display), newEgg: display.petNewEgg.bind(display),
            bringBack: display.petBringBack.bind(display), look: display.look.bind(display),
            lookPlace: display.lookPlace.bind(display),
            handOver: display.petHandOver.bind(display), takeIn: display.petTakeIn.bind(display),
            retire: display.petRetire.bind(display),
          },
          request.method ?? "GET", url, () => readJson(request));
        if (answer === NOT_A_PET_ROUTE) {
          throw new Refusal(404);
        }
        return json(answer);
      }
    }
  }

  return (request, response) => {
    const send: Send = (status, body, headers) => {
      response.writeHead(status, { ...headers, "Content-Length": Buffer.byteLength(body) });
      response.end(request.method === "HEAD" ? undefined : body);
    };
    const refuse = (status: number): void => send(status, "", { "Content-Type": "text/plain", Connection: "close" });

    if (!isHomeNetwork(request.socket.remoteAddress)) {
      return refuse(403);
    }
    // A custom header forces a CORS preflight on other websites, which we never answer – so no
    // other site can control the matrix.
    if (request.method !== "GET" && request.method !== "HEAD"
        && request.headers["x-requested-with"] !== "led-matrix") {
      return refuse(403);
    }

    let url: URL;
    try {
      url = new URL(request.url ?? "/", "http://pi");
    } catch {
      return refuse(400);
    }
    handle(request, url, send).catch((error: unknown) => {
      if (response.headersSent) {
        response.destroy();
      } else if (error instanceof RequestError) {
        // 400 with the text for a key from the "error" texts (that is what a RequestError carries)
        send(400, JSON.stringify({ error: t(`error.${error.message}`, { max: MAX_NAME }), key: error.message }),
          { "Content-Type": "application/json" });
      } else if (error instanceof Refusal) {
        refuse(error.status);
      } else {
        log.error(`${request.method} ${url.pathname} failed`, error);
        refuse(500);
      }
    });
  };
}
