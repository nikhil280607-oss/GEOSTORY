/**
 * search.js — the search box in the header.
 *
 * Added after Lab 7 (issue H7, "flexibility and efficiency of use"): a user
 * who already knows what they want (a place, a person, a year) can jump
 * straight to it instead of travelling along the timeline.
 *
 * It searches the 22 stories and the 17 timeline stops that are already in
 * the page, so it needs no server. It follows the ARIA "combobox" pattern:
 * type, move with ↑ ↓, press Enter.
 */

import { CHAPTERS, STORIES, THREADS, WAYPOINTS, getEraIndex, storiesForEra } from "./content.js";
import { el, fold, icon } from "./util.js";

const MAX_RESULTS = 8;
const EXAMPLES = ["Mansa Musa", "Rome", "printing", "1300"];

/* Everything searchable, prepared once. `strong` fields count more than `body`. */
const INDEX = [
  ...WAYPOINTS.map((w, index) => {
    const chapter = CHAPTERS.find((c) => c.id === w.chapter);
    const count = storiesForEra(w.id).length;
    return {
      kind: "era", index, order: index - 0.5,
      title: w.label, sub: `${w.title} · ${count ? `${count} ${count === 1 ? "story" : "stories"}` : "before the first map"}`,
      strong: fold(`${w.label} ${w.short} ${w.title} ${chapter.name}`),
      body: fold(w.intro || w.text || ""),
    };
  }),
  ...STORIES.map((s) => {
    const era = WAYPOINTS[getEraIndex(s.waypoint)];
    const thread = THREADS[s.thread];
    return {
      kind: "story", id: s.id, order: getEraIndex(s.waypoint), color: thread.color,
      title: s.title, sub: `${s.place} · ${era.short} · ${thread.name}`,
      strong: fold(`${s.title} ${s.place} ${s.tag} ${thread.name} ${era.short}`),
      body: fold(`${s.dek} ${s.detail}`),
    };
  }),
];

/** Every word of the query must appear; matches at the start of a word, and in titles, rank higher. */
export function search(query) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const startOfWord = (text, w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(text);
  const scored = [];
  for (const item of INDEX) {
    let score = 0;
    for (const w of words) {
      if (startOfWord(item.strong, w)) score += 10;
      else if (item.strong.includes(w)) score += 6;
      else if (startOfWord(item.body, w)) score += 3;
      else if (item.body.includes(w)) score += 1;
      else { score = -1; break; }
    }
    if (score > 0) scored.push({ item, score: score + (item.kind === "era" && score >= 10 * words.length ? 1 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score || a.item.order - b.item.order).slice(0, MAX_RESULTS).map((s) => s.item);
}

export class SearchBox {
  /**
   * @param {HTMLElement} root
   * @param {{ onGoToStory(storyId), onGoToEra(index) }} handlers
   */
  constructor(root, handlers) {
    this.root = root;
    this.handlers = handlers;
    this.results = [];
    this.active = -1;
    this.build();
  }

  build() {
    this.input = el("input", {
      class: "search-input", type: "text", id: "search-input", autocomplete: "off", spellcheck: "false",
      placeholder: "Search stories, places, years", "aria-label": "Search stories, places and years",
      role: "combobox", "aria-expanded": "false", "aria-controls": "search-list", "aria-autocomplete": "list",
      oninput: () => this.update(),
      onfocus: () => this.update(),
      onkeydown: (e) => this.onKey(e),
    });
    // The drop-down: a note (tips, or "nothing found") and the list of results.
    this.note = el("div", { class: "search-empty" });
    this.list = el("div", { class: "search-list", id: "search-list", role: "listbox", "aria-label": "Search results" });
    this.pop = el("div", { class: "search-pop", hidden: true }, this.note, this.list);
    this.status = el("p", { class: "sr-only", role: "status" });

    // In small windows the field hides behind this button.
    this.openBtn = el("button", {
      class: "btn btn-ghost search-open", type: "button", "aria-label": "Search", title: "Search (press /)",
      onclick: () => this.focus(),
    }, icon("search"));

    const field = el("div", { class: "search-field" },
      icon("search", "icon search-icon"),
      this.input,
      el("kbd", { class: "search-kbd", title: "Press / to search" }, "/"),
      el("button", { class: "search-close", type: "button", "aria-label": "Close search", onclick: () => this.close(true), html: icon("close").innerHTML }),
      this.pop);

    this.root.append(this.openBtn, field, this.status);

    // Clicking anywhere else closes the results.
    document.addEventListener("pointerdown", (e) => {
      if (!this.root.contains(e.target)) this.close(false);
    });
  }

  focus() {
    this.root.classList.add("is-open");
    this.input.focus();
    this.input.select();
  }

  /** @param {boolean} clear  also empty the box */
  close(clear) {
    if (clear) this.input.value = "";
    this.root.classList.remove("is-open");
    this.pop.hidden = true;
    this.input.setAttribute("aria-expanded", "false");
    this.input.removeAttribute("aria-activedescendant");
    this.active = -1;
    if (this.root.contains(document.activeElement)) document.activeElement.blur();
  }

  update() {
    const q = this.input.value.trim();
    this.results = search(q);
    this.active = this.results.length ? 0 : -1;
    this.root.classList.add("is-open");

    if (!q) {
      this.note.replaceChildren(
        el("p", {}, "Type a place, a person, a topic or a year. For example:"),
        el("div", { class: "search-examples" }, EXAMPLES.map((x) =>
          el("button", { class: "search-example", type: "button", onclick: () => { this.input.value = x; this.input.focus(); this.update(); } }, x))));
      this.status.textContent = "";
    } else if (!this.results.length) {
      this.note.replaceChildren(
        el("p", {}, el("strong", {}, `Nothing found for “${q}”.`)),
        el("p", {}, "Check the spelling, or try a place (Rome), a person (Mansa Musa) or a year (1300)."));
      this.status.textContent = `No results for ${q}`;
    } else {
      this.status.textContent = `${this.results.length} result${this.results.length === 1 ? "" : "s"}. Use the arrow keys and press Enter.`;
    }
    this.note.hidden = this.results.length > 0;
    this.list.hidden = this.results.length === 0;
    this.list.replaceChildren(...this.results.map((r, i) => this.option(r, i)));
    this.pop.hidden = false;
    this.input.setAttribute("aria-expanded", "true");
    this.markActive();
  }

  option(r, i) {
    return el("div", {
      class: `search-option is-${r.kind}`, role: "option", id: `search-opt-${i}`,
      style: r.color ? { "--thread": r.color } : null,
      onpointerdown: (e) => e.preventDefault(), // keep the focus in the box
      onclick: () => this.choose(i),
      onpointermove: () => { if (this.active !== i) { this.active = i; this.markActive(); } },
    },
      r.kind === "story" ? el("span", { class: "lg-swatch" }) : icon("clock", "icon search-era-icon"),
      el("span", { class: "search-option-text" },
        el("span", { class: "search-option-title" }, r.title),
        el("span", { class: "search-option-sub" }, r.sub)),
      el("span", { class: "search-option-kind" }, r.kind === "story" ? "Story" : "Year"));
  }

  markActive() {
    [...this.list.querySelectorAll(".search-option")].forEach((o, i) => {
      o.classList.toggle("is-active", i === this.active);
      o.setAttribute("aria-selected", String(i === this.active));
      if (i === this.active) o.scrollIntoView({ block: "nearest" });
    });
    if (this.active >= 0) this.input.setAttribute("aria-activedescendant", `search-opt-${this.active}`);
    else this.input.removeAttribute("aria-activedescendant");
  }

  onKey(e) {
    const n = this.results.length;
    if (e.key === "ArrowDown" && n) { e.preventDefault(); this.active = (this.active + 1) % n; this.markActive(); }
    else if (e.key === "ArrowUp" && n) { e.preventDefault(); this.active = (this.active - 1 + n) % n; this.markActive(); }
    else if (e.key === "Enter" && this.active >= 0) { e.preventDefault(); this.choose(this.active); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.close(true); }
  }

  choose(i) {
    const r = this.results[i];
    if (!r) return;
    this.close(true);
    if (r.kind === "story") this.handlers.onGoToStory(r.id);
    else this.handlers.onGoToEra(r.index);
  }
}
