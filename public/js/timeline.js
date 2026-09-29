/**
 * timeline.js — the time slider along the bottom of the screen.
 *
 * - One stop per waypoint, evenly spaced (deep time is compressed on purpose).
 * - Chapter bands above the track show the 8 Big History thresholds.
 * - Works by drag, click, the arrow buttons, or the keyboard (← → Home End).
 * - It is a proper ARIA slider, so screen readers announce the era.
 */

import { CHAPTERS, WAYPOINTS } from "./content.js";
import { el, icon } from "./util.js";

const INSET = 3;

export class Timeline {
  constructor(root, { onChange }) {
    this.root = root;
    this.onChange = onChange;
    this.index = 0;
    this.n = WAYPOINTS.length;
    this.build();
  }

  /** Position of stop i along the track, in %. Stops start 3% in from each end. */
  pct(i) {
    return INSET + (i / (this.n - 1)) * (100 - 2 * INSET);
  }

  build() {
    this.prevBtn = el("button", { class: "tl-step tl-prev", type: "button", "aria-label": "Previous era", onclick: () => this.step(-1) },
      icon("chevronLeft"), el("span", { class: "tl-step-label" }));
    this.nextBtn = el("button", { class: "tl-step tl-next", type: "button", "aria-label": "Next era", onclick: () => this.step(1) },
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
        class: "tl-chapter", "data-chapter": ch.id, title: `Threshold ${ch.n}: ${ch.name}`,
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
        class: `tl-stop ${w.kind === "cosmos" ? "is-cosmos" : ""} ${i === 0 || w.chapter !== WAYPOINTS[i - 1].chapter ? "is-major" : ""}`,
        type: "button", tabindex: "-1", "aria-hidden": "true",
        style: { left: `${this.pct(i)}%` },
        onclick: (e) => { e.stopPropagation(); this.set(i, true); },
      }, el("span", { class: "tl-dot" }), el("span", { class: "tl-tick" }, w.tick));
      this.track.append(stop);
      return stop;
    });

    this.handle = el("div", { class: "tl-handle", "aria-hidden": "true" }, el("span", { class: "tl-handle-core" }));
    this.track.append(this.handle);

    const body = el("div", { class: "tl-body" }, chapters, this.track);
    this.root.append(this.prevBtn, body, this.nextBtn);
    this.chaptersEl = chapters;

    this.bindDrag();
    this.track.addEventListener("keydown", (e) => {
      const map = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -3, PageUp: 3 };
      if (e.key in map) { e.preventDefault(); this.step(map[e.key]); }
      if (e.key === "Home") { e.preventDefault(); this.set(0, true); }
      if (e.key === "End") { e.preventDefault(); this.set(this.n - 1, true); }
    });

    new ResizeObserver(() => this.root.classList.toggle("tl-compact", this.track.clientWidth / this.n < 62)).observe(this.track);
  }

  bindDrag() {
    const indexAt = (clientX) => {
      const r = this.track.getBoundingClientRect();
      const f = ((clientX - r.left) / r.width) * 100;
      const t = (f - INSET) / (100 - 2 * INSET);
      return Math.min(this.n - 1, Math.max(0, Math.round(t * (this.n - 1))));
    };
    this.track.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      this.track.setPointerCapture(e.pointerId);
      this.root.classList.add("is-dragging");
      this.set(indexAt(e.clientX), true);
    });
    this.track.addEventListener("pointermove", (e) => {
      if (this.dragging) this.set(indexAt(e.clientX), true);
    });
    const end = () => {
      this.dragging = false;
      this.root.classList.remove("is-dragging");
    };
    this.track.addEventListener("pointerup", end);
    this.track.addEventListener("pointercancel", end);
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

    if (fromUser) this.onChange(i);
  }
}
