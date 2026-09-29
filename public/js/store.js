/**
 * store.js — the app's single source of truth.
 *
 * state = { eraIndex, storyId, readerOpen, journalOpen }
 * Modules call store.set({...}) and subscribe to changes. This keeps the map,
 * timeline, story card and URL in sync without them calling each other.
 */

const listeners = new Set();

const state = {
  eraIndex: 0,
  storyId: null,
  readerOpen: false,
  journalOpen: false,
};

export const store = {
  get: () => ({ ...state }),

  set(patch) {
    const prev = { ...state };
    let changed = false;
    for (const [k, v] of Object.entries(patch)) {
      if (state[k] !== v) {
        state[k] = v;
        changed = true;
      }
    }
    if (changed) listeners.forEach((fn) => fn(state, prev));
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
