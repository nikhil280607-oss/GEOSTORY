/**
 * content.js — one place to look things up in the data files, so the UI
 * modules never have to know how the data is stored.
 */

import { CHAPTERS, WAYPOINTS, YEARS_AGO } from "../data/waypoints.js";
import { THREADS, THREAD_ORDER } from "../data/threads.js";
import { STORIES } from "../data/stories.js";
import { CHRONICLES } from "../data/chronicles/mansa-musa.js";

export { CHAPTERS, WAYPOINTS, THREADS, THREAD_ORDER, STORIES, CHRONICLES, YEARS_AGO };

const storyById = new Map(STORIES.map((s) => [s.id, s]));
const eraIndexById = new Map(WAYPOINTS.map((w, i) => [w.id, i]));

export const getStory = (id) => storyById.get(id) || null;
export const getEraIndex = (eraId) => eraIndexById.get(eraId) ?? -1;
export const getEra = (index) => WAYPOINTS[index] || null;
export const getChapter = (chapterId) => CHAPTERS.find((c) => c.id === chapterId);

export function storiesForEra(eraId) {
  return STORIES.filter((s) => s.waypoint === eraId);
}

/** All stories of a thread, in chapter order. */
export function threadStories(threadId) {
  return STORIES.filter((s) => s.thread === threadId).sort((a, b) => a.order - b.order);
}

/** Previous and next story in the same thread (either may be null). */
export function threadNeighbours(story) {
  const list = threadStories(story.thread);
  const i = list.findIndex((s) => s.id === story.id);
  return { prev: list[i - 1] || null, next: list[i + 1] || null, index: i + 1, total: list.length };
}

export function eraLabelFor(story) {
  const era = WAYPOINTS[getEraIndex(story.waypoint)];
  return era ? era.label : "";
}

/** Index of the first map era, used by the intro "Jump in" button. */
export const FIRST_MAP_INDEX = WAYPOINTS.findIndex((w) => w.kind === "map");
