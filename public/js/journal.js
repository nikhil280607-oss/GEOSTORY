/**
 * journal.js — "Your journal": the archive of saved stories.
 *
 * Saved in this browser (localStorage), so it needs no account or backend.
 * Other modules call journal.toggle(id) / journal.has(id) and listen for
 * changes with journal.subscribe(fn).
 *
 * Changes after the Lab 7 evaluation (issues H3, H4, H5):
 *   - Removing a story uses a bin icon. Before, it was the same × as the
 *     button that closes the panel, so one icon meant two different things.
 *   - A removed story can be brought back with "Undo" for a few seconds.
 *     We chose undo over an "Are you sure?" box: removing a bookmark is a
 *     small action, and a confirmation on every click would slow everyone down.
 */

import { STORIES, THREADS, THREAD_ORDER, eraLabelFor, getStory } from "./content.js";
import { el, icon, safeStorage } from "./util.js";

const KEY = "geostory.journal.v1";
const UNDO_SECONDS = 7;
const listeners = new Set();
let saved = safeStorage.get(KEY, []).filter((id) => getStory(id)); // drop ids that no longer exist

function emit() {
  safeStorage.set(KEY, saved);
  listeners.forEach((fn) => fn(saved));
}

export const journal = {
  has: (id) => saved.includes(id),
  count: () => saved.length,
  toggle(id) {
    saved = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    emit();
    return saved.includes(id);
  },
  /** Removes a story and returns where it was in the list, so it can be put back. */
  remove(id) {
    const position = saved.indexOf(id);
    saved = saved.filter((x) => x !== id);
    emit();
    return position;
  },
  /** Puts a removed story back at its old position (used by Undo). */
  restore(id, position) {
    if (saved.includes(id) || !getStory(id)) return;
    saved = [...saved];
    saved.splice(Math.max(0, Math.min(position, saved.length)), 0, id);
    emit();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/** The slide-over panel that lists saved stories, grouped by thread. */
export class JournalPanel {
  constructor(root, { onOpenStory, onClose }) {
    this.root = root;
    this.onOpenStory = onOpenStory;
    this.onClose = onClose;
    this.removed = null; // { id, position, timer } while the Undo message is showing
    journal.subscribe(() => this.isOpen && this.render());
  }

  open() {
    this.isOpen = true;
    this.render();
    this.root.hidden = false;
    requestAnimationFrame(() => this.root.classList.add("is-open"));
    this.root.querySelector(".jr-close")?.focus();
  }

  close() {
    this.forgetRemoved();
    this.isOpen = false;
    this.root.classList.remove("is-open");
    setTimeout(() => { if (!this.isOpen) this.root.hidden = true; }, 260);
  }

  render() {
    const panel = el("div", { class: "jr-panel", role: "dialog", "aria-modal": "true", "aria-labelledby": "jr-title" });
    panel.append(el("header", { class: "jr-head" },
      el("div", {},
        el("p", { class: "jr-kicker" }, "Your archive"),
        el("h2", { id: "jr-title", class: "jr-title" }, "Journal")),
      el("button", { class: "icon-btn jr-close", type: "button", "aria-label": "Close journal", onclick: this.onClose, html: icon("close").innerHTML })));

    if (this.removed) panel.append(this.undoBar());

    const ids = saved.filter((id) => getStory(id));
    if (!ids.length) {
      panel.append(el("div", { class: "jr-empty" },
        el("div", { class: "jr-empty-mark", html: icon("bookmark").innerHTML }),
        el("p", { class: "jr-empty-title" }, "Start your journal"),
        el("p", {}, "Open any story and press Save. Your saved stories collect here, grouped by thread, so you can pick up the journey later.")));
    } else {
      for (const tid of THREAD_ORDER) {
        const items = STORIES.filter((s) => s.thread === tid && ids.includes(s.id)).sort((a, b) => a.order - b.order);
        if (!items.length) continue;
        const t = THREADS[tid];
        const group = el("section", { class: "jr-group", style: { "--thread": t.color } },
          el("h3", { class: "jr-group-title" }, el("span", { class: "jr-swatch" }), t.name));
        for (const s of items) {
          group.append(el("div", { class: "jr-item" },
            el("button", { class: "jr-open", type: "button", onclick: () => this.onOpenStory(s.id) },
              el("span", { class: "jr-item-era" }, `${eraLabelFor(s)} · ${s.place}`),
              el("span", { class: "jr-item-title" }, s.title)),
            el("button", {
              class: "icon-btn jr-remove", type: "button", title: "Remove from journal",
              "aria-label": `Remove “${s.title}” from the journal`,
              onclick: () => this.remove(s.id), html: icon("trash").innerHTML,
            })));
        }
        panel.append(group);
      }
    }
    panel.append(el("p", { class: "jr-foot" }, "Saved in this browser only. No account needed."));

    this.root.replaceChildren(el("div", { class: "jr-scrim", onclick: this.onClose }), panel);
  }

  /* ------------------------------------------------ remove and undo ---- */

  remove(id) {
    this.forgetRemoved();
    this.removed = { id, position: -1, timer: setTimeout(() => this.forgetRemoved(true), UNDO_SECONDS * 1000) };
    this.removed.position = journal.remove(id); // re-renders the panel, now with the Undo message
    this.root.querySelector(".jr-undo-btn")?.focus();
  }

  undo() {
    const r = this.removed;
    if (!r) return;
    this.forgetRemoved();
    journal.restore(r.id, r.position);
    this.root.querySelector(".jr-close")?.focus();
  }

  /** Stops offering Undo. `redraw` also takes the message off the screen. */
  forgetRemoved(redraw = false) {
    if (!this.removed) return;
    clearTimeout(this.removed.timer);
    this.removed = null;
    if (redraw && this.isOpen) {
      const hadFocus = this.root.contains(document.activeElement);
      this.render();
      if (hadFocus) this.root.querySelector(".jr-close")?.focus();
    }
  }

  undoBar() {
    const story = getStory(this.removed.id);
    return el("div", { class: "jr-undo", role: "status" },
      el("span", { class: "jr-undo-text" }, "Removed ", el("strong", {}, `“${story.title}”`)),
      el("button", { class: "btn jr-undo-btn", type: "button", onclick: () => this.undo() }, icon("undo"), "Undo"),
      el("span", { class: "jr-undo-timer", style: { animationDuration: `${UNDO_SECONDS}s` } }));
  }
}
