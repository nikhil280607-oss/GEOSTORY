/**
 * threads.js — the connected storylines.
 *
 * Every story belongs to one thread. A thread is an ordered chain of stories
 * across eras, so the user can follow one idea through time instead of reading
 * isolated facts ("Continue the thread →").
 *
 * The threads follow the big through-lines used by popular world histories,
 * e.g. Peter Frankopan, "The Silk Roads" (2015); Michael Gomez, "African
 * Dominion" (2018); Yuval Noah Harari, "Sapiens" (2014); and the Big History
 * framework for deep time.
 */

export const THREADS = {
  "human-story": {
    name: "The human story",
    color: "#7fae8a",
    blurb: "From the dinosaurs' fall to the first cities: how one African species came to build civilisations.",
  },
  ideas: {
    name: "Ideas that travel",
    color: "#86a9dc",
    blurb: "How writing and knowledge spread, from hieroglyphs to the World Wide Web.",
  },
  silk: {
    name: "The Silk Roads",
    color: "#d9774f",
    blurb: "The web of routes linking China, Persia, India and Rome, and how it moved to the sea.",
  },
  gold: {
    name: "Gold and salt",
    color: "#e0b54f",
    blurb: "West Africa's gold, carried across the Sahara, shaped kingdoms on three continents.",
  },
  engines: {
    name: "Engines of change",
    color: "#b199d6",
    blurb: "Machines, factories and the world's workshops.",
  },
};

export const THREAD_ORDER = ["human-story", "ideas", "silk", "gold", "engines"];
