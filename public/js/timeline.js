/**
 * timeline.js — the time slider along the bottom of the screen.
 *
 * - One stop per waypoint, evenly spaced (deep time is compressed on purpose).
 * - Chapter bands above the track show the 8 Big History thresholds.
 * - Works by drag, click, the arrow buttons, or the keyboard (← → Home End).
 * - It is a proper ARIA slider, so screen readers announce the era.
 *
 * Changes after the Lab 7 usability test:
 * - Bigger, two-line date labels ("66" over "million") instead of "66 m".
 * - Hovering a stop shows its full date and title.
 * - A one-time hint tells first-time users that any year can be clicked.
 * - When the window is too narrow for readable labels (small windows, or a
 *   browser zoom of 200%), the track scrolls sideways instead of squeezing
 *   or hiding the labels.
 */

import { CHAPTERS, WAYPOINTS } from "./content.js";
import { el, icon, prefersReducedMotion } from "./util.js";

const INSET = 3;

export class Timeline {
  constructor(root, { onChange }) {
    this.root = root;
    this.onChange = onChange;
    this.index = 0;
    this.n = WAYPOINTS.length;
    this.scrollable = false;
    this.build();
  }

  /** Position of stop i along the track, in %. Stops start 3% in from each end. */
  pct(i) {
    return INSET + (i / (this.n - 1)) * (100 - 2 * INSET);
  }

  build() {
    this.prevBtn = el("button", { class: "tl-step tl-prev", type: "button", "aria-label": "Previous era", onclick: () => { this.used(); this.step(-1); } },
      icon("chevronLeft"), el("span", { class: "tl-step-label" }));
    this.nextBtn = el("button", { class: "tl-step tl-next", type: "button", "aria-label": "Next era", onclick: () => { this.used(); this.step(1); } },
      el("span", { class: "tl-step-label" }), icon("chevronRight"));

    // Chapter bands: each covers its stops, from half a step before to half a step after.
    const chapters = el("div", { class: "tl-chapters", "aria-hidden": "true" });
    for (const ch of CHAPTERS) {
      const idx = WAYPOINTS.map((w, i) => (w.chapter === ch.id ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) continue;
      const step = (100 - 2 * INSET) / (this.n - 1);
      const left = Math.max(0, this.pct(idx[0]) - step / 2);
      const right = Math.min(100, this.pct(idx[idx.length - 1]) + step / 2);
      chapters.append(el("div", {
        class: "tl-chapter", "data-chapter": ch.id,
        style: { left: `${left}%`, width: `${right - left}%` },
      }, el("span", { class: "tl-chapter-name" }, ch.short)));
    }

    this.track = el("div", {
      class: "tl-track", role: "slider", tabindex: "0",
      "aria-label": "Travel through time", "aria-valuemin": "0", "aria-valuemax": String(this.n - 1),
    });
    this.track.append(el("div", { class: "tl-rail" }), (this.fill = el("div", { class: "tl-fill" })));

    this.stops = WAYPOINTS.map((w, i) => {
      const stop = el("button", {
        class: `tl-stop ${w.kind === "cosmos" ? "is-cosmos" : ""}`,
        type: "button", tabindex: "-1", "aria-hidden": "true",
        style: { left: `${this.pct(i)}%` },
        onclick: (e) => { e.stopPropagation(); this.used(); this.set(i, true); },
        onpointerenter: (e) => e.pointerType === "mouse" && this.showTip(i),
        onpointerleave: () => this.hideTip(),
      },
        el("span", { class: "tl-dot" }),
        el("span", { class: "tl-tick" },
          el("span", { class: "tl-num" }, w.num),
          el("span", { class: "tl-unit" }, w.unit || " ")));
      this.track.append(stop);
      return stop;
    });

    this.handle = el("div", { class: "tl-handle", "aria-hidden": "true" }, el("span", { class: "tl-handle-core" }));
    this.track.append(this.handle);

    // .tl-body scrolls sideways when .tl-inner (which has a minimum width) doesn't fit.
    this.inner = el("div", { class: "tl-inner" }, chapters, this.track);
    this.body = el("div", { class: "tl-body" }, this.inner);
    this.tip = el("div", { class: "tl-tip", role: "tooltip", hidden: true });
    this.hint = el("div", { class: "tl-hint", hidden: true },
      el("strong", {}, "Travel through time"),
      " Drag the gold marker, or click any year.");
    this.root.append(this.prevBtn, this.body, this.nextBtn, this.tip, this.hint);
    this.chaptersEl = chapters;

    this.bindPointer();
    this.track.addEventListener("keydown", (e) => {
      const map = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -3, PageUp: 3 };
      if (e.key in map) { e.preventDefault(); this.used(); this.step(map[e.key]); }
      if (e.key === "Home") { e.preventDefault(); this.used(); this.set(0, true); }
      if (e.key === "End") { e.preventDefault(); this.used(); this.set(this.n - 1, true); }
    });

    // Sideways scrolling, only when the labels would not fit otherwise.
    this.body.addEventListener("scroll", () => { this.updateEdges(); this.hideTip(); }, { passive: true });
    this.body.addEventListener("wheel", (e) => {
      if (!this.scrollable || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      this.body.scrollLeft += e.deltaY;
    }, { passive: false });
    new ResizeObserver(() => {
      this.scrollable = this.body.scrollWidth > this.body.clientWidth + 1;
      this.root.classList.toggle("is-scrollable", this.scrollable);
      this.centreActive(false);
      this.updateEdges();
      this.placeHint();
    }).observe(this.body);
  }

  bindPointer() {
    const indexAt = (clientX) => {
      const r = this.track.getBoundingClientRect();
      const f = ((clientX - r.left) / r.width) * 100;
      const t = (f - INSET) / (100 - 2 * INSET);
      return Math.min(this.n - 1, Math.max(0, Math.round(t * (this.n - 1))));
    };
    this.track.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      // On touch screens a sideways swipe scrolls a scrollable track, so a
      // finger only picks a year when it taps (see the click handler below).
      if (this.scrollable && e.pointerType !== "mouse") return;
      this.dragging = true;
      this.track.setPointerCapture(e.pointerId);
      this.root.classList.add("is-dragging");
      this.used();
      this.set(indexAt(e.clientX), true);
    });
    this.track.addEventListener("pointermove", (e) => {
      if (this.dragging) this.set(indexAt(e.clientX), true);
    });
    const end = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.root.classList.remove("is-dragging");
      this.centreActive(true);
    };
    this.track.addEventListener("pointerup", end);
    this.track.addEventListener("pointercancel", end);
    this.track.addEventListener("click", (e) => { this.used(); this.set(indexAt(e.clientX), true); });
  }

  step(delta) {
    this.set(Math.min(this.n - 1, Math.max(0, this.index + delta)), true);
  }

  /** Moves the handle. `fromUser` = true notifies the app. */
  set(i, fromUser = false) {
    if (i === this.index && this.rendered) return;
    this.index = i;
    this.rendered = true;
    const w = WAYPOINTS[i];

    this.handle.style.left = `${this.pct(i)}%`;
    this.fill.style.width = `${this.pct(i)}%`;
    this.stops.forEach((s, j) => {
      s.classList.toggle("is-active", j === i);
      s.classList.toggle("is-past", j < i);
    });
    this.chaptersEl.querySelectorAll(".tl-chapter").forEach((c) => c.classList.toggle("is-active", c.dataset.chapter === w.chapter));

    this.track.setAttribute("aria-valuenow", String(i));
    this.track.setAttribute("aria-valuetext", `${w.label}: ${w.title}`);

    const prev = WAYPOINTS[i - 1];
    const next = WAYPOINTS[i + 1];
    this.prevBtn.disabled = !prev;
    this.nextBtn.disabled = !next;
    this.prevBtn.querySelector(".tl-step-label").textContent = prev ? prev.tick : "";
    this.nextBtn.querySelector(".tl-step-label").textContent = next ? next.tick : "";
    this.prevBtn.setAttribute("aria-label", prev ? `Previous era: ${prev.label}` : "Previous era");
    this.nextBtn.setAttribute("aria-label", next ? `Next era: ${next.label}` : "Next era");
    this.prevBtn.title = prev ? `Back to ${prev.short}` : "";
    this.nextBtn.title = next ? `Forward to ${next.short}` : "";

    if (!this.dragging) this.centreActive(true);
    this.placeHint();
    if (fromUser) this.onChange(i);
  }

  /* ---------------------------------------------- sideways scrolling ---- */

  /** Keeps the current stop in the middle of a scrolling track. */
  centreActive(smooth) {
    if (!this.scrollable) return;
    const stop = this.stops[this.index].getBoundingClientRect();
    const box = this.body.getBoundingClientRect();
    const target = this.body.scrollLeft + (stop.left + stop.width / 2 - box.left) - box.width / 2;
    this.body.scrollTo({ left: target, behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" });
  }

  /** Fades the edge of the track on the side that has more years to scroll to. */
  updateEdges() {
    const max = this.body.scrollWidth - this.body.clientWidth;
    this.root.classList.toggle("at-start", this.body.scrollLeft <= 2);
    this.root.classList.toggle("at-end", this.body.scrollLeft >= max - 2);
  }

  /* ---------------------------------------------- hover label ---- */

  /** Full date and title above a stop, e.g. "66 million years ago · The dinosaurs' last day". */
  showTip(i) {
    const w = WAYPOINTS[i];
    this.tip.replaceChildren(
      el("strong", {}, w.label),
      el("span", {}, w.title),
      el("em", {}, i === this.index ? "You are here" : "Click to travel here"));
    this.tip.hidden = false;
    this.placeAbove(this.tip, this.stops[i]);
  }

  hideTip() {
    this.tip.hidden = true;
  }

  /** Centres a bubble above a stop, kept inside the timeline's width. */
  placeAbove(bubble, stop) {
    const root = this.root.getBoundingClientRect();
    const r = stop.getBoundingClientRect();
    const half = bubble.offsetWidth / 2;
    const x = Math.min(root.width - half - 8, Math.max(half + 8, r.left + r.width / 2 - root.left));
    bubble.style.left = `${x}px`;
  }

  /* ---------------------------------------------- first-visit hint ---- */

  /** Called once the welcome page is closed. Shown until the timeline is first used. */
  showHint() {
    if (this.hintDone) return;
    this.hint.hidden = false;
    this.placeHint();
    requestAnimationFrame(() => this.hint.classList.add("is-in"));
  }

  placeHint() {
    if (!this.hint.hidden) this.placeAbove(this.hint, this.stops[Math.min(this.index + 2, this.n - 1)]);
  }

  /** The user has used the timeline, so the hint has done its job. */
  used() {
    this.hintDone = true;
    this.hint.hidden = true;
  }
}
