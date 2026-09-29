/**
 * reader.js — the full chronicle, opened from "Read the full chronicle".
 *
 * Designed to read like a short illustrated feature, not an encyclopedia
 * page: a hero image, six short chapters with a pull quote each, a sticky
 * route map that follows the chapter you're reading, "Myth or fact?",
 * "Then and now", Ask the Chronicler, and the sources.
 */

import { CHRONICLES, THREADS, threadNeighbours, eraLabelFor, getStory } from "./content.js";
import { loadLand } from "./geoData.js";
import { el, icon, safeImage } from "./util.js";
import { journal } from "./journal.js";
import { narrator } from "./narrator.js";
import { createAskBox } from "./askBox.js";

const d3 = window.d3;

export class Reader {
  constructor(root, { onClose, onGoToStory }) {
    this.root = root;
    this.onClose = onClose;
    this.onGoToStory = onGoToStory;
    this.observer = null;
    journal.subscribe(() => this.syncSave());
  }

  open(storyId) {
    const story = getStory(storyId);
    const c = story && CHRONICLES[story.chronicle];
    if (!c) return;
    narrator.stop();
    this.story = story;
    this.chronicle = c;
    const t = THREADS[story.thread];
    const nb = threadNeighbours(story);

    this.progress = el("div", { class: "rd-progress-bar" });
    this.saveBtn = el("button", { class: "btn btn-ghost rd-save", type: "button", onclick: () => journal.toggle(story.id) }, icon("bookmark"), el("span", { class: "label" }, "Save"));
    this.listenBtn = el("button", { class: "btn btn-ghost rd-listen", type: "button", onclick: () => this.toggleListen() }, icon("speaker"), el("span", { class: "label" }, "Listen"));
    if (!narrator.supported) this.listenBtn.hidden = true;

    const bar = el("header", { class: "rd-bar" },
      el("button", { class: "btn btn-ghost rd-back", type: "button", onclick: this.onClose }, icon("arrowLeft"), "Back to the map"),
      el("p", { class: "rd-bar-title" }, c.title),
      el("div", { class: "rd-bar-actions" }, this.listenBtn, this.saveBtn),
      el("div", { class: "rd-progress" }, this.progress));

    const hero = el("section", { class: "rd-hero" },
      el("div", { class: "rd-hero-img" }, safeImage({ src: c.hero.src, alt: c.hero.alt, className: "rd-hero-frame", fallback: "decor" })),
      el("div", { class: "rd-hero-text" },
        el("p", { class: "rd-kicker", style: { "--thread": t.color } }, el("span", { class: "sc-swatch" }), `${t.name} · chapter ${nb.index} of ${nb.total}`),
        el("h1", { class: "rd-title" }, c.title),
        el("p", { class: "rd-standfirst" }, c.standfirst),
        el("p", { class: "rd-meta" }, `${c.kicker} · ${c.readMinutes} min read`),
        el("p", { class: "rd-hero-credit" }, el("a", { href: c.hero.page, target: "_blank", rel: "noopener" }, `${c.hero.caption} ${c.hero.credit}`))));

    const article = el("article", { class: "rd-article" });
    c.chapters.forEach((ch, i) => {
      const sec = el("section", { class: "rd-chapter", "data-chapter": ch.id, id: `ch-${ch.id}` },
        el("p", { class: "rd-numeral" }, ch.numeral),
        el("h2", { class: "rd-h2" }, ch.title),
        ch.paragraphs.map((p, j) => el("p", { class: i === 0 && j === 0 ? "rd-p rd-dropcap" : "rd-p" }, p)));
      if (ch.pull) sec.append(el("blockquote", { class: "rd-pull" }, ch.pull));
      if (ch.figure) {
        sec.append(el("figure", { class: "rd-figure" },
          safeImage({ src: ch.figure.src, alt: ch.figure.alt, className: "rd-figure-frame" }),
          el("figcaption", {}, ch.figure.caption, " ", el("a", { href: ch.figure.page, target: "_blank", rel: "noopener" }, ch.figure.credit))));
      }
      article.append(sec);
    });

    article.append(el("section", { class: "rd-block rd-myth" },
      el("h2", { class: "rd-h2" }, "Myth or fact?"),
      el("p", { class: "rd-block-sub" }, "What the sources actually support."),
      el("div", { class: "rd-myth-grid" }, c.mythFact.map((m) =>
        el("div", { class: "rd-myth-card" },
          el("p", { class: "rd-claim" }, `“${m.claim}”`),
          el("p", { class: `rd-verdict v-${m.verdict.toLowerCase().replace(/[^a-z]+/g, "-")}` }, m.verdict),
          el("p", { class: "rd-myth-note" }, m.note))))));

    article.append(el("section", { class: "rd-block rd-thennow" },
      el("h2", { class: "rd-h2" }, "Then and now"),
      el("div", { class: "rd-tn-grid" },
        el("div", { class: "rd-tn" }, el("p", { class: "rd-tn-label" }, "Then"), el("p", {}, c.thenNow.then)),
        el("div", { class: "rd-tn" }, el("p", { class: "rd-tn-label" }, "Now"), el("p", {}, c.thenNow.now)))));

    article.append(el("section", { class: "rd-block" }, createAskBox(story)));

    const endNav = el("section", { class: "rd-block rd-endnav" });
    if (nb.next) {
      endNav.append(el("button", { class: "sc-next", type: "button", style: { "--thread": t.color }, onclick: () => this.onGoToStory(nb.next.id) },
        el("span", { class: "sc-next-label" }, "Continue the thread"),
        el("span", { class: "sc-next-title" }, nb.next.title),
        el("span", { class: "sc-next-meta" }, `${eraLabelFor(nb.next)} · ${nb.next.place}`),
        icon("arrowRight", "icon sc-next-arrow")));
    }
    article.append(endNav);

    article.append(el("section", { class: "rd-block rd-sources" },
      el("h2", { class: "rd-h2" }, "Sources"),
      el("p", { class: "rd-block-sub" }, "This chronicle is written in our own words from these works."),
      el("ol", {}, c.sources.map((s) => el("li", {}, s)))));

    this.minimap = el("div", { class: "rd-minimap" });
    this.minimapCaption = el("p", { class: "rd-minimap-caption" }, "Approximate route");
    const aside = el("aside", { class: "rd-aside", "aria-label": "Route map" },
      el("div", { class: "rd-aside-inner" },
        el("p", { class: "rd-aside-title" }, "The journey, 1324–25"),
        this.minimap,
        el("div", { class: "rd-legend" },
          el("span", { class: "lg-out" }, "Outbound"),
          el("span", { class: "lg-home" }, "Homeward")),
        this.minimapCaption));

    this.scroller = el("div", { class: "rd-scroll" }, hero, el("div", { class: "rd-layout" }, article, aside));
    this.root.replaceChildren(el("div", { class: "rd", role: "dialog", "aria-modal": "true", "aria-label": c.title }, bar, this.scroller));
    this.root.hidden = false;
    document.body.classList.add("reader-open");
    requestAnimationFrame(() => this.root.classList.add("is-open"));

    this.scroller.addEventListener("scroll", () => {
      const s = this.scroller;
      const f = s.scrollTop / Math.max(1, s.scrollHeight - s.clientHeight);
      this.progress.style.transform = `scaleX(${f})`;
    }, { passive: true });

    this.syncSave();
    this.drawMinimap();
    this.root.querySelector(".rd-back").focus();
  }

  close() {
    narrator.stop();
    if (this.observer) this.observer.disconnect();
    this.root.classList.remove("is-open");
    document.body.classList.remove("reader-open");
    setTimeout(() => {
      if (!this.root.classList.contains("is-open")) {
        this.root.hidden = true;
        this.root.replaceChildren();
      }
    }, 300);
  }

  syncSave() {
    if (!this.story || !this.saveBtn) return;
    const on = journal.has(this.story.id);
    this.saveBtn.classList.toggle("is-on", on);
    this.saveBtn.querySelector(".label").textContent = on ? "Saved" : "Save";
  }

  toggleListen() {
    if (narrator.isSpeaking()) {
      narrator.stop();
      return;
    }
    const c = this.chronicle;
    const btn = this.listenBtn;
    btn.classList.add("is-on");
    btn.querySelector(".label").textContent = "Stop";
    const parts = [c.title, c.standfirst];
    c.chapters.forEach((ch) => parts.push(`Chapter ${ch.numeral}. ${ch.title}.`, ...ch.paragraphs));
    narrator.speak(parts, () => {
      btn.classList.remove("is-on");
      btn.querySelector(".label").textContent = "Listen";
    });
  }

  /** Route map that highlights the places of the chapter being read. */
  async drawMinimap() {
    const c = this.chronicle;
    const pts = c.route.points;
    const W = 320;
    const H = 230;
    const svg = d3.select(this.minimap).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
      .attr("aria-label", "Map of the approximate route from Mali to Mecca and back");

    const all = { type: "MultiPoint", coordinates: Object.values(pts).map((p) => [p.lon, p.lat]) };
    const projection = d3.geoMercator().fitExtent([[26, 22], [W - 26, H - 22]], all);
    const path = d3.geoPath(projection);

    let land;
    try {
      land = await loadLand();
    } catch {
      land = null;
    }
    if (!this.minimap.isConnected) return;

    svg.append("rect").attr("class", "mm-sea").attr("width", W).attr("height", H).attr("rx", 10);
    const clip = svg.append("defs").append("clipPath").attr("id", "mm-clip");
    clip.append("rect").attr("width", W).attr("height", H).attr("rx", 10);
    const g = svg.append("g").attr("clip-path", "url(#mm-clip)");
    if (land) g.append("path").attr("class", "mm-land").attr("d", path(land));

    const line = (keys) => ({ type: "LineString", coordinates: keys.map((k) => [pts[k].lon, pts[k].lat]) });
    g.append("path").attr("class", "mm-route mm-home").attr("d", path(line(c.route.homebound)));
    g.append("path").attr("class", "mm-route mm-out").attr("d", path(line(c.route.outbound)));

    const nodes = g.selectAll("g.mm-pt").data(Object.entries(pts)).join("g")
      .attr("class", "mm-pt")
      .attr("data-key", (d) => d[0])
      .attr("transform", (d) => `translate(${projection([d[1].lon, d[1].lat])})`);
    nodes.append("circle").attr("r", 3.6);
    nodes.append("text")
      .attr("x", (d) => (d[0] === "timbuktu" ? -7 : 7))
      .attr("y", (d) => (d[0] === "gao" ? 12 : d[0] === "timbuktu" ? -6 : 4))
      .attr("text-anchor", (d) => (d[0] === "timbuktu" ? "end" : "start"))
      .text((d) => d[1].name);

    const byId = Object.fromEntries(c.chapters.map((ch) => [ch.id, ch]));
    const highlight = (chId) => {
      const ch = byId[chId];
      if (!ch) return;
      nodes.classed("is-focus", (d) => ch.focus.includes(d[0]));
      this.minimapCaption.textContent = `Chapter ${ch.numeral}: ${ch.title}`;
    };
    highlight(c.chapters[0].id);

    this.observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) highlight(visible[0].target.dataset.chapter);
    }, { root: this.scroller, rootMargin: "-35% 0px -55% 0px" });
    this.root.querySelectorAll(".rd-chapter").forEach((s) => this.observer.observe(s));
  }
}
