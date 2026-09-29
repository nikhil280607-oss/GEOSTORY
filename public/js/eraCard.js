/**
 * eraCard.js — the title panel in the top-left corner of the map
 * (or the larger caption on deep-time "cosmos" eras).
 * It cross-fades whenever the era changes, so every move on the timeline
 * gets visible feedback.
 */

import { CHAPTERS, YEARS_AGO, storiesForEra } from "./content.js";
import { el, icon, prefersReducedMotion } from "./util.js";

export class EraCard {
  constructor(root, { onNext }) {
    this.root = root;
    this.onNext = onNext;
    this.timer = null;
  }

  show(era, index, total) {
    const render = () => {
      this.root.replaceChildren(era.kind === "cosmos" ? this.cosmos(era, index, total) : this.map(era));
      this.root.className = `era-card ${era.kind === "cosmos" ? "is-cosmos" : "is-map"}`;
      requestAnimationFrame(() => this.root.classList.add("is-in"));
    };
    clearTimeout(this.timer);
    if (prefersReducedMotion() || !this.root.firstChild) return render();
    this.root.classList.remove("is-in");
    this.timer = setTimeout(render, 180);
  }

  chapterLine(era) {
    const ch = CHAPTERS.find((c) => c.id === era.chapter);
    return el("p", { class: "era-chapter" }, `Threshold ${ch.n} of 8`, el("span", { class: "era-dot" }, "·"), ch.name);
  }

  map(era) {
    const count = storiesForEra(era.id).length;
    return el("div", { class: "era-inner" },
      this.chapterLine(era),
      el("h1", { class: "era-label" }, era.label),
      el("p", { class: "era-title" }, era.title),
      el("p", { class: "era-intro" }, era.intro),
      el("p", { class: "era-meta" },
        el("span", {}, YEARS_AGO[era.id] === "now" ? "The present day" : YEARS_AGO[era.id] || ""),
        el("span", { class: "era-dot" }, "·"),
        el("span", { class: "era-count" }, `${count} ${count === 1 ? "story" : "stories"} here`)),
      era.mapNote ? el("p", { class: "era-note" }, era.mapNote) : null,
      el("p", { class: "era-hint" }, "Tap a glowing pin to open its story."),
    );
  }

  cosmos(era, index, total) {
    return el("div", { class: "era-inner" },
      this.chapterLine(era),
      el("p", { class: "era-label-small" }, era.label),
      el("h1", { class: "era-cosmos-title" }, era.title),
      el("p", { class: "era-cosmos-text" }, era.text),
      el("div", { class: "era-cosmos-foot" },
        el("button", { class: "btn btn-gold", type: "button", onclick: this.onNext },
          index < 4 ? "Keep travelling" : "See the first map", icon("arrowRight")),
        el("span", { class: "era-progress" }, `Stop ${index + 1} of ${total}`)),
    );
  }
}
