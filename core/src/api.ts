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

/** Where the requests go. `action` and `newEgg` are the pet's own, or the Pi's, which also show it on the panel. */
export interface PetTarget {
  pet: Pet;
  action: Pet["action"];
  newEgg: Pet["newEgg"];
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
      return { api: 1, events: pet.events(Math.min(100, Math.max(1, limit))) };
    }

    case "POST /api/pet/action": {
      const request = fields(await body());
      const id = request.id ?? null;
      if (id !== null && (typeof id !== "string" || id.length > 64)) {
        throw new RequestError("invalid_id");
      }
      const result = target.action(request.action as string,
        { item: request.item, by: request.by as string, requestId: id, throw: request.throw, value: request.value });
      return { api: 1, ...result };
    }

    case "POST /api/pet/new_egg": {
      const request = fields(await body());
      if (request.confirm !== true) {
        throw new RequestError("confirm");
      }
      return target.newEgg(request.egg ?? null);
    }

    case "GET /api/pet/travels":
      return { api: 1, travels: pet.travels() };

    case "GET /api/pet/ancestors":
      return { api: 1, ancestors: pet.ancestorList(), album: pet.albumList() };

    case "POST /api/pet/settings":
      pet.rename(fields(await body()).name);
      return pet.snapshot();

    default:
      return NOT_A_PET_ROUTE;
  }
}
