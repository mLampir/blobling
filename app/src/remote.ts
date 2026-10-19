/**
 * The pet on the Pi: the page sends its requests to the Pi's API (pi/src/web.ts).
 *
 * The Pi's own page talks to the Pi it came from. The app on the phone talks to the address
 * the player connected it to; there the native HTTP of the app carries the requests
 * (CapacitorHttp in capacitor.config.json), so the Pi needs no CORS and plain HTTP on the home
 * network works.
 */

import { API_VERSION } from "../../core/src/api";
import type { I18n } from "../../core/src/i18n";

const TIMEOUT_MS = 8000;

/** "blobling.local" or "192.168.0.42:8080" -> "http://blobling.local", or null if it is no address. */
export function piAddress(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`);
    return url.hostname ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * Whether a Pi and this app understand each other (core/src/api.ts): "ok", "display_old" (the
 * app needs more than the Pi offers) or "app_old" (the Pi no longer serves an app this old).
 * null if the answer does not tell.
 */
export type Fit = "ok" | "display_old" | "app_old";

export function apiFit(answer: unknown): Fit | null {
  const outer = (answer ?? {}) as { state?: unknown };
  const pet = (outer.state !== null && typeof outer.state === "object" ? outer.state : outer) as
    { api?: unknown; api_oldest?: unknown };
  if (typeof pet.api !== "number") {
    return null;
  }
  if (pet.api < API_VERSION) {
    return "display_old";
  }
  // a Pi from before api_oldest serves every app up to its own version
  if (typeof pet.api_oldest !== "number") {
    return null;
  }
  return pet.api_oldest > API_VERSION ? "app_old" : "ok";
}

export class RemotePet {
  /** Whether the Pi and this app fit together, as its last answer that told. */
  fit: Fit = "ok";

  /** `base`: the Pi's address, "" for the Pi the page came from. */
  constructor(readonly base: string, private readonly i18n: I18n) {}

  /** Throws an Error with the text for the page; `offline` is set if the Pi cannot be reached. */
  async request(method: string, path: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(this.base + path, {
        method,
        // the Pi only takes changes that carry this header (no other website can send it)
        headers: { "X-Requested-With": "led-matrix", "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout?.(TIMEOUT_MS),
      });
    } catch {
      throw Object.assign(new Error(this.i18n.t("page.offline.title")), { offline: true });
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || this.i18n.t("error.http", { status: response.status }));
    }
    this.fit = apiFit(data) ?? this.fit;
    return data;
  }

  /** Whether a pet answers there (also one of another version, which the page then asks to update). */
  async reachable(): Promise<boolean> {
    try {
      return typeof (await this.request("GET", "/api/pet") as { api?: unknown }).api === "number";
    } catch {
      return false;
    }
  }
}
