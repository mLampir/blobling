/**
 * The pet's JSON API: what the pet page asks and what it sends.
 *
 * The page talks to it in both of its modes, so the routes live here once: the Pi answers them
 * over HTTP (pi/src/web.ts), the app on the phone answers them in the page itself
 * (app/src/local.ts). Both hand in the pet and how an action reaches it; the Pi also wakes the
 * panel on the way.
 */

import { RequestError } from "./model";
import type { Pet } from "./pet";

/**
 * The version of this API. The app from the stores and the Pi are updated apart (the stores take
 * days to review, a Pi updates itself within hours), so an app may talk to an older or a newer Pi.
 * Every answer carries these two numbers, and the app compares them with its own (app/src/remote.ts):
 *
 * - API_VERSION goes up by one with every change the app may come to rely on: a new route,
 *   action or field. An app that needs more than a Pi offers asks for the Pi to be updated.
 * - API_OLDEST is the oldest API_VERSION an app may have and still work with this Pi. It is set
 *   to API_VERSION when something an older app relies on is removed or changed. A Pi newer than
 *   that asks for the app to be updated.
 *
 * core/test/api.test.ts compares the API with core/test/api-contract.json and says which number
 * a change needs (CLAUDE.md, "The API between app and Pi").
 */
export const API_VERSION = 4;
export const API_OLDEST = 1;

/**
 * Where the requests go. `action`, `newEgg` and `swap` are the pet's own, or the Pi's, which also
 * show it on the panel.
 */
export interface PetTarget {
  pet: Pet;
  action: Pet["action"];
  newEgg: (egg: unknown, keep: unknown) => ReturnType<Pet["newEgg"]>;
  swap: () => ReturnType<Pet["swap"]>;
}

/** What a request that is not one of the pet's routes gets back. */
export const NOT_A_PET_ROUTE = Symbol("not a pet route");

function fields(body: unknown): Record<string, unknown> {
  return body !== null && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

/**
 * Answers a request to /api/pet…; `body` reads the JSON the request carries (only POST asks for
 * it). Throws a RequestError (a key from the "error" texts) for an invalid request.
 */
export async function petRequest(target: PetTarget, method: string, url: URL,
    body: () => Promise<unknown>): Promise<unknown> {
  const { pet } = target;
  switch (`${method === "HEAD" ? "GET" : method} ${url.pathname}`) {
    case "GET /api/pet":
      return pet.snapshot();

    case "GET /api/pet/events": {
      const asked = url.searchParams.get("limit") ?? "";
      const limit = /^\s*[+-]?\d+\s*$/.test(asked) ? Number(asked) : 20;
      return { api: API_VERSION, events: pet.events(Math.min(100, Math.max(1, limit))) };
    }

    case "POST /api/pet/action": {
      const request = fields(await body());
      const id = request.id ?? null;
      if (id !== null && (typeof id !== "string" || id.length > 64)) {
        throw new RequestError("invalid_id");
      }
      const result = target.action(request.action as string,
        { item: request.item, by: request.by as string, requestId: id, throw: request.throw, value: request.value });
      return { api: API_VERSION, ...result };
    }

    case "POST /api/pet/new_egg": {
      const request = fields(await body());
      if (request.confirm !== true) {
        throw new RequestError("confirm");
      }
      return target.newEgg(request.egg ?? null, request.keep ?? null);
    }

    case "POST /api/pet/swap":
      return { api: API_VERSION, ...target.swap() };

    case "GET /api/pet/travels":
      return { api: API_VERSION, travels: pet.travels() };

    case "GET /api/pet/ancestors":
      return { api: API_VERSION, ancestors: pet.ancestorList(), album: pet.albumList() };

    case "POST /api/pet/settings":
      pet.rename(fields(await body()).name);
      return pet.snapshot();

    default:
      return NOT_A_PET_ROUTE;
  }
}
