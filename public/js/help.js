/**
 * help.js — the Help page. It is also the first screen a new visitor sees.
 *
 * Why it exists: in the Lab 7 usability test, users could finish the tasks but
 * did not know what GeoStory is, that any year on the timeline can be clicked,
 * or how the five threads connect the stories (issues U1 and U2). The old
 * welcome screen had three short tips and did not mention threads.
 *
 * The page answers, in order:
 *   1. What is GeoStory?
 *   2. How does the screen work?   (a screenshot with numbered arrows)
 *   3. What are the five threads, and how do I follow one?
 *   4. Shortcuts
 * and ends with one button: Enter.
 */

import { THREADS, THREAD_ORDER, WAYPOINTS, getEraIndex, threadStories } from "./content.js";
import { el, icon } from "./util.js";

/**
 * Numbered arrows on the screenshot. All positions are % of the picture, so
 * they stay in place at any size.  at = the thing pointed at,  from = where
 * the numbered label sits.  (Made by scripts/make-help-shot.mjs.)
 */
const CALLOUTS = [
  { n: 1, name: "Timeline", at: [69.2, 92.6], from: [56.5, 84],
    text: "Drag the gold marker, click any year, or press ← →. It runs from the Big Bang to today." },
  { n: 2, name: "Pins", at: [35.3, 44.2], from: [23, 33],
    text: "Every glowing pin is a story at that place and time. Click a pin to open it." },
  { n: 3, name: "Story card", at: [71.8, 22.6], from: [57, 13.5],
    text: "A short story about the place. You can read the full chronicle, save it, or listen to it." },
  { n: 4, name: "Continue the thread", at: [72.2, 76.6], from: [55, 66],
    text: "Takes you to the next chapter of the same thread, in a later era." },
  { n: 5, name: "Threads", at: [20, 70.4], from: [31.5, 61],
    text: "The five storylines. Open one to see all its chapters and jump to any of them." },
  { n: 6, name: "Search, Help, Journal", at: [60.4, 3.5], from: [43, 3.5],
    text: "Search jumps straight to a story. The Journal keeps the stories you save." },
];

const SHOT = { src: "img/help-screen.jpg", width: 1440, height: 860 };

export class HelpPage {
  /** @param {{ onEnter(): void }} handlers  onEnter runs when the page closes */
  constructor(root, { onEnter }) {
    this.root = root;
    this.onEnter = onEnter;
    this.isOpen = false;
    this.onKey = (e) => {
      if (e.key === "Escape") this.close();
    };
    this.app = document.querySelector(".app");
  }

  /** @param {boolean} firstVisit  true = shown as the welcome screen */
  open(firstVisit) {
    this.isOpen = true;
    this.firstVisit = firstVisit;
    this.returnFocus = document.activeElement;
    this.root.replaceChildren(this.render(firstVisit));
    this.root.hidden = false;
    this.app.inert = true; // the page behind can't be clicked or tabbed into while Help is open
    requestAnimationFrame(() => this.root.classList.add("is-open"));
    document.addEventListener("keydown", this.onKey);
    this.root.querySelector(".help-enter").focus({ preventScroll: true });
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.app.inert = false;
    this.root.classList.remove("is-open");
    setTimeout(() => { if (!this.isOpen) this.root.hidden = true; }, 400);
    document.removeEventListener("keydown", this.onKey);
    this.onEnter(this.firstVisit);
    if (!this.firstVisit && this.returnFocus && this.returnFocus.focus) this.returnFocus.focus();
  }

  render(firstVisit) {
    const page = el("div", { class: "help", role: "dialog", "aria-modal": "true", "aria-labelledby": "help-title" });

    // Focusable, so the page can be scrolled with the keyboard too.
    const scroll = el("div", { class: "help-scroll", tabindex: "0", role: "region", "aria-label": "Help contents" },
      el("div", { class: "help-col" },
        this.hero(firstVisit),
        this.screenSection(),
        this.threadsSection(),
        this.shortcutsSection()));

    const bar = el("footer", { class: "help-bar" },
      el("p", { class: "help-bar-note" }, firstVisit
        ? "You can open this page again any time from Help, at the top right."
        : "Press Esc or the button to go back."),
      el("button", { class: "btn btn-gold help-enter", type: "button", onclick: () => this.close() },
        firstVisit ? "Enter GeoStory" : "Back to GeoStory", icon("arrowRight")));

    page.append(scroll, bar);
    return page;
  }

  hero(firstVisit) {
    return el("header", { class: "help-hero" },
      el("img", { class: "help-logo", src: "img/logo.svg", alt: "", width: "56", height: "56" }),
      el("div", {},
        el("p", { class: "help-kicker" }, firstVisit ? "Welcome · start here" : "Help"),
        el("h1", { class: "help-title", id: "help-title" }, "GeoStory"),
        el("p", { class: "help-tag" }, "A journey through human history, on a map")),
      el("div", { class: "help-what" },
        el("h2", { class: "help-h2" }, "What is GeoStory?"),
        el("p", {}, "GeoStory is a map of history that you can move through time. Choose a moment, from the Big Bang to today, and the map shows the world as it was then."),
        el("p", {}, "Each pin on the map is a short, true story about that place and time. The stories are not random: they are linked into five ",
          el("strong", {}, "threads"), ", so you can follow one idea, such as trade or writing, across thousands of years.")));
  }

  screenSection() {
    const arrows = CALLOUTS.map((c) => {
      const [x1, y1] = [c.from[0] * SHOT.width / 100, c.from[1] * SHOT.height / 100];
      const [x2, y2] = [c.at[0] * SHOT.width / 100, c.at[1] * SHOT.height / 100];
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#help-arrow)"/>`;
    }).join("");

    const figure = el("figure", { class: "help-shot" },
      el("div", { class: "help-shot-frame" },
        el("img", {
          src: SHOT.src, width: SHOT.width, height: SHOT.height, loading: "eager",
          alt: "The GeoStory screen: a world map with pins, a story card on the right, the Threads panel at the bottom left and the timeline along the bottom.",
        }),
        el("div", {
          class: "help-arrows", "aria-hidden": "true",
          html: `<svg viewBox="0 0 ${SHOT.width} ${SHOT.height}" preserveAspectRatio="none">
                   <defs><marker id="help-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                     <path d="M0,0 L10,5 L0,10 z"/></marker></defs>${arrows}</svg>`,
        }),
        CALLOUTS.map((c) => el("span", {
          class: "help-tag-on-shot", "aria-hidden": "true",
          style: { left: `${c.from[0]}%`, top: `${c.from[1]}%` },
        }, el("b", {}, c.n), el("span", {}, c.name)))),
      el("figcaption", { class: "help-shot-cap" }, "The screen with a story open. The numbers match the list."));

    const list = el("ol", { class: "help-parts" }, CALLOUTS.map((c) =>
      el("li", {}, el("b", { class: "help-num" }, c.n), el("div", {}, el("strong", {}, c.name), el("span", {}, c.text)))));

    return el("section", { class: "help-section" },
      el("h2", { class: "help-h2" }, "How the screen works"),
      el("div", { class: "help-screen" }, figure, list));
  }

  threadsSection() {
    const when = (s) => WAYPOINTS[getEraIndex(s.waypoint)].short;
    const cards = THREAD_ORDER.map((id) => {
      const t = THREADS[id];
      const stories = threadStories(id);
      return el("li", { class: "help-thread", style: { "--thread": t.color } },
        el("p", { class: "help-thread-name" }, el("span", { class: "lg-swatch" }), t.name),
        el("p", { class: "help-thread-meta" }, `${stories.length} chapters · ${when(stories[0])} to ${when(stories[stories.length - 1])}`),
        el("p", { class: "help-thread-blurb" }, t.blurb));
    });

    return el("section", { class: "help-section" },
      el("h2", { class: "help-h2" }, "The five threads"),
      el("p", { class: "help-p" }, "A thread is one storyline told in chapters. Each chapter is a pin in a different era, and each pin has its thread's colour."),
      el("ul", { class: "help-threads" }, cards),
      el("h3", { class: "help-h3" }, "Three ways to follow a thread"),
      el("ol", { class: "help-ways" },
        el("li", {}, el("strong", {}, "From a story."), " Press ", el("em", {}, "Continue the thread"), " on the story card to jump to the next chapter. ", el("em", {}, "Previous chapter"), " takes you back."),
        el("li", {}, el("strong", {}, "From the Threads panel."), " Open ", el("em", {}, "Threads"), " at the bottom left, choose a thread, and pick any chapter from its list."),
        el("li", {}, el("strong", {}, "On the map."), " When a story is open, dotted lines lead to the previous and next chapter. Click the dotted circle to go there.")));
  }

  shortcutsSection() {
    const key = (...keys) => el("span", { class: "help-keys" }, keys.map((k) => el("kbd", {}, k)));
    return el("section", { class: "help-section" },
      el("h2", { class: "help-h2" }, "Shortcuts"),
      el("ul", { class: "help-shortcuts" },
        el("li", {}, key("←", "→"), "Move one step back or forward in time"),
        el("li", {}, key("/"), "Search for a story, place or year"),
        el("li", {}, key("Esc"), "Close the story, journal or this page"),
        el("li", {}, key("Tab"), "Move between pins and buttons, ", key("Enter"), " to open")),
      el("p", { class: "help-foot" }, "Stories are written from historical sources, listed under every story. Saved stories stay in this browser only."));
  }
}
