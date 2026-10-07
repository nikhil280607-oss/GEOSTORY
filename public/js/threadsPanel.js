/**
 * threadsPanel.js — the "Threads" panel in the bottom-left corner of the map.
 *
 * A thread is one storyline that runs through several eras. In the Lab 7
 * usability test most users did not understand this (issue U1), because the
 * panel only listed five names. So the panel now:
 *   - shows how many chapters each thread has
 *   - lists a thread's chapters, with their dates, when you hover or click it
 *   - lets you jump straight to any chapter
 *   - marks the chapter you are reading ("You are here")
 *
 * It also folds down to a single "Threads" button when a story is open
 * (issue H8, less clutter) and in small windows / at 200% zoom (issue A1:
 * before, the panel simply disappeared).
 */

import { THREADS, THREAD_ORDER, WAYPOINTS, getEraIndex, getStory, threadStories } from "./content.js";
import { el, icon, LAYOUT } from "./util.js";

const shortDate = (story) => WAYPOINTS[getEraIndex(story.waypoint)].short;

export class ThreadsPanel {
  /**
   * @param {HTMLElement} root
   * @param {{ onGoToStory(storyId), onHighlight(threadId|null) }} handlers
   */
  constructor(root, handlers) {
    this.root = root;
    this.handlers = handlers;
    this.openId = null;     // thread whose chapter list is showing
    this.pinned = false;    // opened by click (stays) rather than hover (leaves with the mouse)
    this.storyOpen = false;
    this.items = new Map(); // threadId -> { li, button, chapters: Map(storyId -> button) }
    this.build();
  }

  build() {
    const root = this.root;
    this.toggle = el("button", {
      class: "lg-toggle", type: "button", "aria-expanded": "true", "aria-controls": "lg-body",
      onclick: () => this.setFolded(!this.folded),
    },
      icon("thread"), el("span", { class: "lg-toggle-text" }, "Threads"),
      el("span", { class: "lg-total", title: "5 threads" }, THREAD_ORDER.length),
      (this.currentDot = el("span", { class: "lg-current-dot", hidden: true })),
      icon("chevronDown", "icon lg-chevron"));

    const list = el("ul", { class: "lg-list" });
    for (const id of THREAD_ORDER) {
      const t = THREADS[id];
      const stories = threadStories(id);
      const chapterButtons = new Map();

      const chapters = el("ol", { class: "lg-ch-list" }, stories.map((s, i) => {
        const b = el("button", { class: "lg-ch", type: "button", onclick: () => this.go(s.id) },
          el("span", { class: "lg-ch-n" }, i + 1),
          el("span", { class: "lg-ch-text" },
            el("span", { class: "lg-ch-title" }, s.title),
            el("span", { class: "lg-ch-meta" }, `${shortDate(s)} · ${s.place}`)),
          el("span", { class: "lg-ch-here" }, "You are here"));
        chapterButtons.set(s.id, b);
        return el("li", {}, b);
      }));

      const fly = el("div", { class: "lg-fly", id: `lg-fly-${id}`, hidden: true },
        el("div", { class: "lg-fly-box" },
          el("p", { class: "lg-fly-name" }, el("span", { class: "lg-swatch" }), t.name),
          el("p", { class: "lg-fly-blurb" }, t.blurb),
          el("p", { class: "lg-fly-how" }, `${stories.length} chapters, from ${shortDate(stories[0])} to ${shortDate(stories[stories.length - 1])}. Pick one to go there.`),
          chapters));

      const button = el("button", {
        class: "lg-item", type: "button", "aria-expanded": "false", "aria-controls": `lg-fly-${id}`,
        onclick: () => (this.openId === id && this.pinned ? this.closeThread() : this.openThread(id, true)),
        onkeydown: (e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            if (this.openId !== id) this.openThread(id, true);
            if (e.key === "ArrowRight") { e.preventDefault(); chapters.querySelector("button").focus(); }
          }
        },
      },
        el("span", { class: "lg-swatch" }),
        el("span", { class: "lg-name" }, t.name),
        el("span", { class: "lg-count" }, `${stories.length} chapters`),
        icon("chevronRight", "icon lg-arrow"));

      const li = el("li", {
        class: "lg-thread", style: { "--thread": t.color },
        onpointerenter: (e) => e.pointerType === "mouse" && this.hover(id),
      }, button, fly);
      list.append(li);
      this.items.set(id, { li, button, fly, chapters: chapterButtons });
    }

    this.bodyEl = el("div", { class: "lg-body", id: "lg-body" },
      el("p", { class: "lg-hint" }, "Five storylines that run through time. Pick one to see its chapters."),
      list);
    root.append(this.toggle, this.bodyEl);

    // Hover: open after a short pause, close a moment after the mouse leaves the panel.
    root.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      clearTimeout(this.hoverTimer);
      if (!this.pinned) this.hoverTimer = setTimeout(() => this.closeThread(), 260);
    });
    root.addEventListener("pointerenter", () => clearTimeout(this.hoverTimer));
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.openId) {
        e.stopPropagation();
        const { button } = this.items.get(this.openId);
        this.closeThread();
        button.focus();
      }
    });
    document.addEventListener("pointerdown", (e) => {
      if (this.openId && !root.contains(e.target)) this.closeThread();
    });

    // Small windows start folded; going back to a big window unfolds again.
    this.foldByDefault();
    LAYOUT.compact.addEventListener("change", () => this.foldByDefault());
  }

  /* ------------------------------------------------ chapter lists ---- */

  hover(id) {
    clearTimeout(this.hoverTimer);
    // In small windows the chapters open inside the list, so they open by click only.
    if (LAYOUT.compact.matches || this.pinned || this.openId === id) return;
    // A short pause, so sweeping the mouse across the list doesn't flicker.
    this.hoverTimer = setTimeout(() => this.openThread(id, false), this.openId ? 140 : 60);
  }

  openThread(id, pinned) {
    clearTimeout(this.hoverTimer);
    for (const [tid, item] of this.items) {
      const on = tid === id;
      item.li.classList.toggle("is-open", on);
      item.fly.hidden = !on;
      item.button.setAttribute("aria-expanded", String(on));
    }
    this.openId = id;
    this.pinned = pinned;
    this.handlers.onHighlight(id);
  }

  closeThread() {
    clearTimeout(this.hoverTimer);
    if (!this.openId) return;
    const item = this.items.get(this.openId);
    item.li.classList.remove("is-open");
    item.fly.hidden = true;
    item.button.setAttribute("aria-expanded", "false");
    this.openId = null;
    this.pinned = false;
    this.handlers.onHighlight(null);
  }

  go(storyId) {
    this.closeThread();
    this.handlers.onGoToStory(storyId);
  }

  /* ------------------------------------------------ folding ---- */

  /** Folded = only the "Threads" button shows. The user can fold or unfold it at any time. */
  setFolded(folded) {
    this.folded = folded;
    if (folded) this.closeThread();
    this.root.classList.toggle("is-collapsed", folded);
    this.toggle.setAttribute("aria-expanded", String(!folded));
    this.toggle.title = folded ? "Show the five story threads" : "Fold the Threads panel";
  }

  /**
   * The starting state for the current situation: folded in a small window or
   * while a story is open (so the map has room), open otherwise.
   */
  foldByDefault() {
    this.setFolded(LAYOUT.compact.matches || this.storyOpen);
  }

  /**
   * Tells the panel which story is open (or null).
   * Opening a story folds the panel to give the map room; closing the story
   * brings it back.
   */
  setStory(storyId) {
    const story = storyId ? getStory(storyId) : null;
    for (const [tid, item] of this.items) {
      item.li.classList.toggle("is-current", Boolean(story) && story.thread === tid);
      for (const [sid, b] of item.chapters) {
        const here = Boolean(story) && sid === story.id;
        b.classList.toggle("is-here", here);
        if (here) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
      }
    }
    this.currentDot.hidden = !story;
    if (story) this.currentDot.style.background = THREADS[story.thread].color;

    // Fold when a story opens and unfold when it closes. Moving from one story
    // to the next changes nothing, so a panel the user opened stays open.
    const wasOpen = this.storyOpen;
    this.storyOpen = Boolean(story);
    if (this.storyOpen !== wasOpen) this.foldByDefault();
  }
}
