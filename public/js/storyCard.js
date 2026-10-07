/**
 * storyCard.js — the story panel that slides in when a pin is tapped.
 *
 * It only exists in the page while a story is open (the v2 bug was an empty
 * card that was always on the page, just pushed off-screen).
 *
 * Contents, top to bottom: thread strip · place and era · title · image ·
 * story · actions (full chronicle, save, listen) · thread navigation ·
 * Ask the Chronicler · sources.
 */

import { THREADS, threadNeighbours, eraLabelFor, getStory } from "./content.js";
import { el, icon, isSheet, safeImage } from "./util.js";
import { journal } from "./journal.js";
import { narrator } from "./narrator.js";
import { createAskBox } from "./askBox.js";

export class StoryCard {
  constructor(root, { onClose, onGoToStory, onOpenChronicle }) {
    this.root = root;
    this.onClose = onClose;
    this.onGoToStory = onGoToStory;
    this.onOpenChronicle = onOpenChronicle;
    this.story = null;
    journal.subscribe(() => this.syncSave());
  }

  /** Width the map should keep clear on the right (0 on phones, where the card is at the bottom). */
  width() {
    return this.story && !isSheet() ? this.root.offsetWidth + 28 : 0;
  }

  open(story) {
    narrator.stop();
    this.story = story;
    const t = THREADS[story.thread];
    const nb = threadNeighbours(story);

    const card = el("article", { class: "sc", style: { "--thread": t.color }, "aria-labelledby": "sc-title" });

    // Thread strip
    card.append(el("header", { class: "sc-strip" },
      el("span", { class: "sc-swatch" }),
      el("span", { class: "sc-thread-name" }, t.name),
      el("span", { class: "sc-thread-count" }, `Chapter ${nb.index} of ${nb.total}`),
      el("button", { class: "icon-btn sc-close", type: "button", "aria-label": "Close story", onclick: this.onClose, html: icon("close").innerHTML })));

    const body = el("div", { class: "sc-body" });
    body.append(
      el("p", { class: "sc-kicker" }, `${story.place} · ${eraLabelFor(story)}`),
      el("h2", { class: "sc-title", id: "sc-title" }, story.title),
      el("p", { class: "sc-tag" }, story.tag));

    if (story.img) {
      body.append(el("figure", { class: "sc-figure" },
        safeImage({ src: story.img.src, alt: story.img.alt, className: "sc-img" }),
        el("figcaption", {}, el("a", { href: story.img.page, target: "_blank", rel: "noopener" }, story.img.credit))));
    }

    body.append(el("p", { class: "sc-dek" }, story.dek), el("p", { class: "sc-detail" }, story.detail));

    // Actions
    this.saveBtn = el("button", { class: "btn btn-ghost sc-save", type: "button", onclick: () => journal.toggle(story.id) },
      icon("bookmark"), el("span", { class: "label" }));
    this.listenBtn = el("button", { class: "btn btn-ghost sc-listen", type: "button", onclick: () => this.toggleListen() },
      icon("speaker"), el("span", { class: "label" }, "Listen"));
    if (!narrator.supported) this.listenBtn.hidden = true;

    const readBtn = story.chronicle
      ? el("button", { class: "btn btn-gold sc-read", type: "button", onclick: () => this.onOpenChronicle(story.id) },
          icon("book"), "Read the full chronicle")
      : el("span", { class: "sc-soon", title: "The full chronicle for this story is still being written" },
          icon("book"), "Full chronicle (in construction)");

    body.append(el("div", { class: "sc-actions" }, readBtn, el("div", { class: "sc-actions-row" }, this.saveBtn, this.listenBtn)));

    // Thread navigation: what makes the stories feel connected.
    const nav = el("section", { class: "sc-nav", "aria-label": "Follow this thread" });
    if (story.bridge) nav.append(el("p", { class: "sc-bridge" }, story.bridge));
    if (nb.next) {
      nav.append(el("button", { class: "sc-next", type: "button", onclick: () => this.onGoToStory(nb.next.id) },
        el("span", { class: "sc-next-label" }, "Continue the thread"),
        el("span", { class: "sc-next-title" }, nb.next.title),
        el("span", { class: "sc-next-meta" }, `${eraLabelFor(nb.next)} · ${nb.next.place}`),
        icon("arrowRight", "icon sc-next-arrow")));
    } else {
      nav.append(el("p", { class: "sc-end" }, "This is the latest chapter of this thread, so far."));
    }
    if (story.related) {
      const r = getStory(story.related);
      const rt = THREADS[r.thread];
      nav.append(el("button", { class: "sc-related", type: "button", style: { "--thread": rt.color }, onclick: () => this.onGoToStory(r.id) },
        el("span", { class: "sc-swatch" }), `Pick up “${rt.name}”: ${r.title}`, icon("arrowRight")));
    }
    if (nb.prev) {
      nav.append(el("button", { class: "sc-prev", type: "button", onclick: () => this.onGoToStory(nb.prev.id) },
        icon("arrowLeft"), `Previous chapter: ${nb.prev.title} (${eraLabelFor(nb.prev)})`));
    }
    body.append(nav);

    body.append(createAskBox(story, { compact: true }));

    body.append(el("details", { class: "sc-sources" },
      el("summary", {}, "Sources"),
      el("ol", {}, story.sources.map((s) => el("li", {}, s)))));

    card.append(body);
    this.root.replaceChildren(card);
    this.root.hidden = false;
    this.root.scrollTop = 0;
    body.scrollTop = 0;
    requestAnimationFrame(() => this.root.classList.add("is-open"));
    this.syncSave();
  }

  close() {
    narrator.stop();
    this.story = null;
    this.root.classList.remove("is-open");
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      if (!this.story) {
        this.root.hidden = true;
        this.root.replaceChildren();
      }
    }, 320);
  }

  syncSave() {
    if (!this.story || !this.saveBtn) return;
    const on = journal.has(this.story.id);
    this.saveBtn.classList.toggle("is-on", on);
    this.saveBtn.setAttribute("aria-pressed", String(on));
    this.saveBtn.querySelector(".label").textContent = on ? "Saved" : "Save";
  }

  toggleListen() {
    if (narrator.isSpeaking()) {
      narrator.stop();
      return;
    }
    const s = this.story;
    const btn = this.listenBtn;
    btn.classList.add("is-on");
    btn.querySelector(".label").textContent = "Stop";
    btn.querySelector(".icon").innerHTML = icon("stop").innerHTML;
    narrator.speak([`${s.title}. ${s.place}, ${eraLabelFor(s)}.`, s.dek, s.detail, s.bridge], () => {
      btn.classList.remove("is-on");
      btn.querySelector(".label").textContent = "Listen";
      btn.querySelector(".icon").innerHTML = icon("speaker").innerHTML;
    });
  }
}
