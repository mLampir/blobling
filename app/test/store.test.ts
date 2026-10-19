import assert from "node:assert/strict";
import { test } from "node:test";

import { ASIDE_KEY, PET_KEY, takeInSave, type Store } from "../src/store";

function memoryStore(values: Record<string, unknown> = {}): Store & { values: Record<string, unknown> } {
  return {
    values,
    async get(key) {
      return values[key];
    },
    async put(key, value) {
      values[key] = value;
    },
  };
}

test("a pet from the display takes the place of the phone's, which is kept aside", async () => {
  const store = memoryStore({ [PET_KEY]: { pet: "phone" } });
  await takeInSave(store, { pet: "display" });
  assert.deepEqual(store.values, { [PET_KEY]: { pet: "display" }, [ASIDE_KEY]: { pet: "phone" } });
});

test("with no pet on the phone yet, nothing is kept aside", async () => {
  const store = memoryStore();
  await takeInSave(store, { pet: "display" });
  assert.deepEqual(store.values, { [PET_KEY]: { pet: "display" } });
});
