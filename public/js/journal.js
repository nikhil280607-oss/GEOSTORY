/**
 * journal.js — "Your journal": the archive of saved stories.
 *
 * Saved in this browser (localStorage), so it needs no account or backend.
 * Other modules call journal.toggle(id) / journal.has(id) and listen for
 * changes with journal.subscribe(fn).
 */

import { STORIES, THREADS, THREAD_ORDER, eraLabelFor, getStory } from "./content.js";
import { el, icon, safeStorage } from "./util.js";

const KEY = "geostory.journal.v1";
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
  remove(id) {
    saved = saved.filter((x) => x !== id);
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
            el("button", { class: "icon-btn jr-remove", type: "button", "aria-label": `Remove ${s.title}`, onclick: () => journal.remove(s.id), html: icon("close").innerHTML })));
        }
        panel.append(group);
      }
    }
    panel.append(el("p", { class: "jr-foot" }, "Saved in this browser only. No account needed."));

    this.root.replaceChildren(el("div", { class: "jr-scrim", onclick: this.onClose }), panel);
  }
}
