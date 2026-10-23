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
export const API_VERSION = 9;
export const API_OLDEST = 5;

/**
 * Where the requests go. `action`, `newEgg`, `bringBack` and `look` are the pet's own, or the Pi's,
 * which also show them on the panel (and move its camera).
 */
export interface PetTarget {
  pet: Pet;
  action: Pet["action"];
  newEgg: (egg: unknown, place: unknown) => ReturnType<Pet["newEgg"]>;
  bringBack: (bornAt: unknown, place: unknown) => ReturnType<Pet["bringBack"]>;
  /** Somebody switched to the pet with this id: on the phone, the camera goes there. */
  look: (id: unknown) => void;
  /** Somebody looks at the yard at the end of the street (yard.ts): the camera goes there, until it goes to a pet. */
  lookYard: () => void;
  /** A phone takes the pet with this id along (Pet.handOver). */
  handOver: (id: unknown) => ReturnType<Pet["handOver"]>;
  /** A pet from a phone moves in (Pet.takeIn). */
  takeIn: (moving: unknown, place: unknown) => ReturnType<Pet["takeIn"]>;
  /** The pet with this id goes to rest among the ancestors (Pet.retire). */
  retire: (id: unknown) => void;
}

/** The pet's own handlers, for a pet that nothing else shows (the app's, or one in a test). */
export function ownTarget(pet: Pet): PetTarget {
  return {
    pet, action: pet.action.bind(pet), newEgg: (egg, place) => pet.newEgg(egg, undefined, place),
    bringBack: (bornAt, place) => pet.bringBack(bornAt, place), look: (id) => pet.select(id), lookYard: () => {},
    handOver: (id) => pet.handOver(id), takeIn: (moving, place) => pet.takeIn(moving, place),
    retire: (id) => pet.retire(id),
  };
}

/** What a request that is not one of the pet's routes gets back. */
export const NOT_A_PET_ROUTE = Symbol("not a pet route");

function fields(body: unknown): Record<string, unknown> {
  return body !== null && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

/**
 * Answers a request to /api/pet…; `body` reads the JSON the request carries (only POST asks for
 * it). A request is for the pet whose id it carries (`?pet=` or "pet" in the JSON), without one
 * for the pet the camera is on. Throws a RequestError (a key from the "error" texts) for an
 * invalid request.
 */
export async function petRequest(target: PetTarget, method: string, url: URL,
    body: () => Promise<unknown>): Promise<unknown> {
  const { pet } = target;
  const which = url.searchParams.get("pet");
  switch (`${method === "HEAD" ? "GET" : method} ${url.pathname}`) {
    case "GET /api/pet":
      return pet.snapshot(undefined, which);

    case "GET /api/pet/events": {
      const asked = url.searchParams.get("limit") ?? "";
      const limit = /^\s*[+-]?\d+\s*$/.test(asked) ? Number(asked) : 20;
      return { api: API_VERSION, events: pet.events(Math.min(100, Math.max(1, limit)), which) };
    }

    case "POST /api/pet/action": {
      const request = fields(await body());
      const id = request.id ?? null;
      if (id !== null && (typeof id !== "string" || id.length > 64)) {
        throw new RequestError("invalid_id");
      }
      const result = target.action(request.action as string, {
        item: request.item, by: request.by as string, requestId: id, throw: request.throw, value: request.value,
        pet: request.pet,
      });
      return { api: API_VERSION, ...result };
    }

    case "POST /api/pet/new_egg": {
      const request = fields(await body());
      if (request.confirm !== true) {
        throw new RequestError("confirm");
      }
      return target.newEgg(request.egg ?? null, request.place ?? null);
    }

    case "POST /api/pet/look": {
      // switched to another pet (its id): the camera follows; with "yard": true, to the yard, for
      // the pet the request is for (or the camera's)
      const request = fields(await body());
      if (request.yard === true) {
        target.lookYard();
        return pet.snapshot(undefined, request.pet);
      }
      target.look(request.pet);
      return pet.snapshot(undefined, request.pet);
    }

    case "POST /api/pet/bring_back": {
      const request = fields(await body());
      return { api: API_VERSION, ...target.bringBack(request.born_at, request.place ?? null) };
    }

    case "POST /api/pet/hand_over": {
      // a phone takes this pet along; it confirms with handed_over once it has it
      const request = fields(await body());
      return { api: API_VERSION, moving: target.handOver(request.pet) };
    }

    case "POST /api/pet/handed_over": {
      const request = fields(await body());
      pet.handedOver(request.pet, request.moves);
      return { api: API_VERSION, ok: true };
    }

    case "POST /api/pet/take_in": {
      // a pet from a phone moves in
      const request = fields(await body());
      return { api: API_VERSION, ...target.takeIn(request.moving, request.place ?? null) };
    }

    case "POST /api/pet/retire": {
      // somebody sends this pet to rest among the ancestors
      const request = fields(await body());
      if (request.confirm !== true) {
        throw new RequestError("confirm");
      }
      target.retire(request.pet);
      return { api: API_VERSION, ok: true };
    }

    case "GET /api/pet/travels":
      return { api: API_VERSION, travels: pet.travels(which) };

    case "GET /api/pet/ancestors":
      return { api: API_VERSION, ancestors: pet.ancestorList(), album: pet.albumList(), lines: pet.albumLines() };

    case "POST /api/pet/settings": {
      const request = fields(await body());
      pet.rename(request.name, request.pet);
      return pet.snapshot(undefined, request.pet);
    }

    default:
      return NOT_A_PET_ROUTE;
  }
}
