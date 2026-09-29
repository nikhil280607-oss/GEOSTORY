/**
 * main.js — starts GeoStory and connects the pieces.
 *
 * The flow is always: user action -> store.set(...) -> render(). Nothing
 * talks to anything else directly, which keeps the modules independent.
 *
 *   Timeline ─┐                    ┌─> MapView / CosmosView
 *   Map pins ─┼─> store.set() ─────┼─> EraCard
 *   Card nav ─┤                    ├─> StoryCard / Reader
 *   Journal  ─┘                    └─> URL (#era=...&story=...)
 */

import { store } from "./store.js";
import {
  WAYPOINTS, THREADS, THREAD_ORDER, FIRST_MAP_INDEX,
  getEra, getEraIndex, getStory, storiesForEra, threadNeighbours, threadStories,
} from "./content.js";
import { MapView } from "./map.js";
import { CosmosView } from "./cosmos.js";
import { Timeline } from "./timeline.js";
import { EraCard } from "./eraCard.js";
import { StoryCard } from "./storyCard.js";
import { Reader } from "./reader.js";
import { journal, JournalPanel } from "./journal.js";
import { narrator } from "./narrator.js";
import { checkAi } from "./askBox.js";
import { $, el, icon } from "./util.js";

const stage = $("#stage");

/* ------------------------------------------------------------------ actions */

function goToEra(index) {
  const era = getEra(index);
  const current = getStory(store.get().storyId);
  // Leaving the era of the open story closes it.
  store.set({ eraIndex: index, storyId: current && current.waypoint === era.id ? current.id : null });
}

function goToStory(id) {
  const s = getStory(id);
  if (!s) return;
  store.set({ eraIndex: getEraIndex(s.waypoint), storyId: id, readerOpen: false, journalOpen: false });
}

const closeStory = () => store.set({ storyId: null, readerOpen: false });

/* ------------------------------------------------------------------ views */

const mapView = new MapView($("#map"), {
  onPinClick: goToStory,
  onGhostClick: goToStory,
  getCardWidth: () => storyCard.width(),
  getLeftReserve: () => (window.innerWidth >= 900 ? 390 : 0),
});
const cosmos = new CosmosView($("#cosmos"));
const timeline = new Timeline($("#timeline"), { onChange: goToEra });
const eraCard = new EraCard($("#era-card"), { onNext: () => goToEra(Math.min(store.get().eraIndex + 1, WAYPOINTS.length - 1)) });
const storyCard = new StoryCard($("#story-card"), {
  onClose: closeStory,
  onGoToStory: goToStory,
  onOpenChronicle: () => store.set({ readerOpen: true }),
});
const reader = new Reader($("#reader"), {
  onClose: () => store.set({ readerOpen: false }),
  onGoToStory: goToStory,
});
const journalPanel = new JournalPanel($("#journal"), {
  onOpenStory: goToStory,
  onClose: () => store.set({ journalOpen: false }),
});

/* ------------------------------------------------------------------ render */

let mapReady = false;

function render(state, prev, force = false) {
  const era = getEra(state.eraIndex);

  if (force || state.eraIndex !== prev.eraIndex) {
    timeline.set(state.eraIndex);
    eraCard.show(era, state.eraIndex, WAYPOINTS.length);
    const isCosmos = era.kind === "cosmos";
    stage.classList.toggle("is-cosmos", isCosmos);
    if (isCosmos) cosmos.show(era.scene);
    else {
      cosmos.hide();
      if (mapReady) {
        mapView.setEra(era, storiesForEra(era.id));
        if (!state.storyId) mapView.resetView(); // show every pin of the new era
      }
    }
    $("#legend").hidden = isCosmos;
    $("#zoom-controls").hidden = isCosmos;
  }

  if (state.storyId !== prev.storyId || state.eraIndex !== prev.eraIndex) {
    const s = getStory(state.storyId);
    if (s) {
      storyCard.open(s);
      stage.classList.add("has-story");
      if (mapReady) mapView.select(s, threadNeighbours(s));
    } else if (prev.storyId) {
      storyCard.close();
      stage.classList.remove("has-story");
      if (mapReady) mapView.clearSelection();
    }
  }

  if (state.readerOpen !== prev.readerOpen) {
    if (state.readerOpen && state.storyId) reader.open(state.storyId);
    else reader.close();
  }

  if (state.journalOpen !== prev.journalOpen) {
    if (state.journalOpen) journalPanel.open();
    else journalPanel.close();
  }

  writeHash(state);
}

store.subscribe((state, prev) => render(state, prev));

/* ------------------------------------------------------------------ URL */

function writeHash(state) {
  const era = getEra(state.eraIndex);
  const parts = [`era=${era.id}`];
  if (state.storyId) parts.push(`story=${state.storyId}`);
  if (state.readerOpen) parts.push("read=1");
  history.replaceState(null, "", `#${parts.join("&")}`);
}

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const story = getStory(p.get("story"));
  if (story) return { eraIndex: getEraIndex(story.waypoint), storyId: story.id, readerOpen: p.get("read") === "1" && Boolean(story.chronicle) };
  const idx = getEraIndex(p.get("era"));
  return idx >= 0 ? { eraIndex: idx, storyId: null, readerOpen: false } : null;
}

/* ------------------------------------------------------------------ header, legend, zoom */

function buildHeader() {
  const count = el("span", { class: "jr-count" }, journal.count());
  const btn = el("button", { class: "btn btn-ghost hdr-journal", type: "button", onclick: () => store.set({ journalOpen: true }) },
    icon("bookmark"), "Journal", count);
  journal.subscribe((list) => {
    count.textContent = list.length;
    btn.classList.remove("bump");
    void btn.offsetWidth; // restart the little "saved" animation
    btn.classList.add("bump");
  });
  const help = el("button", { class: "btn btn-ghost hdr-help", type: "button", "aria-label": "How to explore", onclick: () => showIntro(true) }, icon("keyboard"), el("span", { class: "hide-sm" }, "How to explore"));
  $("#header-actions").append(help, btn);
}

function buildLegend() {
  const legend = $("#legend");
  const list = el("ul", { class: "lg-list" });
  for (const id of THREAD_ORDER) {
    const t = THREADS[id];
    const first = threadStories(id)[0];
    list.append(el("li", {},
      el("button", {
        class: "lg-item", type: "button", style: { "--thread": t.color },
        title: t.blurb,
        onmouseenter: () => mapView.highlightThread(id),
        onmouseleave: () => mapView.highlightThread(null),
        onfocus: () => mapView.highlightThread(id),
        onblur: () => mapView.highlightThread(null),
        onclick: () => goToStory(first.id),
      }, el("span", { class: "lg-swatch" }), el("span", { class: "lg-name" }, t.name), el("span", { class: "lg-go" }, "Start"))));
  }
  const toggle = el("button", { class: "lg-toggle", type: "button", "aria-expanded": "true", onclick: () => {
    const open = legend.classList.toggle("is-collapsed") === false;
    toggle.setAttribute("aria-expanded", String(open));
  } }, icon("thread"), "Threads");
  legend.append(toggle, list, el("p", { class: "lg-hint" }, "Each thread follows one story through time."));
  if (window.innerHeight < 720) legend.classList.add("is-collapsed");
}

function buildZoom() {
  $("#zoom-controls").append(
    el("button", { class: "icon-btn", type: "button", "aria-label": "Zoom in", onclick: () => mapView.zoomBy(1.6), html: icon("plus").innerHTML }),
    el("button", { class: "icon-btn", type: "button", "aria-label": "Zoom out", onclick: () => mapView.zoomBy(1 / 1.6), html: icon("minus").innerHTML }),
    el("button", { class: "icon-btn", type: "button", "aria-label": "Show the whole world", onclick: () => mapView.resetView(), html: icon("globe").innerHTML }));
}

/* ------------------------------------------------------------------ intro */

function showIntro(asHelp = false) {
  const intro = $("#intro");
  const close = () => {
    intro.classList.remove("is-open");
    setTimeout(() => (intro.hidden = true), 400);
    document.removeEventListener("keydown", onKey);
  };
  const begin = (index, storyId) => {
    close();
    if (storyId) goToStory(storyId);
    else goToEra(index);
    setTimeout(() => $(".tl-track").focus({ preventScroll: true }), 450);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  intro.replaceChildren(el("div", { class: "intro-card" },
    el("img", { class: "intro-logo", src: "img/logo.svg", alt: "", width: "64", height: "64" }),
    el("p", { class: "intro-kicker" }, "A spatiotemporal journey through human history"),
    el("h1", { class: "intro-title" }, "GeoStory"),
    el("p", { class: "intro-lede" }, "13.8 billion years in 17 stops. Travel through time, open the stories on the map, and follow five threads that connect them."),
    el("ol", { class: "intro-steps" },
      el("li", {}, el("strong", {}, "Travel"), " Drag the timeline or press ← →"),
      el("li", {}, el("strong", {}, "Explore"), " Tap a glowing pin to open its story"),
      el("li", {}, el("strong", {}, "Follow"), " Continue a thread to the next chapter")),
    el("div", { class: "intro-actions" },
      asHelp
        ? el("button", { class: "btn btn-gold", type: "button", onclick: close }, "Back to exploring")
        : [
            el("button", { class: "btn btn-gold", type: "button", onclick: () => begin(0) }, "Begin at the Big Bang", icon("arrowRight")),
            el("button", { class: "btn btn-ghost-light", type: "button", onclick: () => begin(null, "mansa-musa") }, "Jump to 1324: Mansa Musa"),
          ]),
    el("p", { class: "intro-foot" }, "Stories are written from historical sources, listed under every story.")));
  intro.hidden = false;
  requestAnimationFrame(() => intro.classList.add("is-open"));
  document.addEventListener("keydown", onKey);
  intro.querySelector(".btn").focus();
}

/* ------------------------------------------------------------------ keyboard */

document.addEventListener("keydown", (e) => {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
  if (!$("#intro").hidden) return;
  const s = store.get();

  if (e.key === "Escape") {
    if (s.readerOpen) store.set({ readerOpen: false });
    else if (s.journalOpen) store.set({ journalOpen: false });
    else if (s.storyId) closeStory();
    return;
  }
  if (s.readerOpen || s.journalOpen) return;
  if (e.target.closest && e.target.closest(".tl-track")) return; // the slider handles its own keys
  if (e.key === "ArrowRight") { e.preventDefault(); goToEra(Math.min(s.eraIndex + 1, WAYPOINTS.length - 1)); }
  if (e.key === "ArrowLeft") { e.preventDefault(); goToEra(Math.max(s.eraIndex - 1, 0)); }
});

/* ------------------------------------------------------------------ boot */

async function boot() {
  buildHeader();
  buildLegend();
  buildZoom();
  checkAi();

  const fromUrl = readHash();
  const initial = fromUrl || { eraIndex: 0, storyId: null, readerOpen: false };

  // First paint with no story, so the era is drawn before anything is selected.
  if (initial.eraIndex !== store.get().eraIndex) store.set({ eraIndex: initial.eraIndex });
  else render(store.get(), store.get(), true);

  try {
    await mapView.init();
    mapReady = true;
    stage.classList.add("map-ready");
    const era = getEra(store.get().eraIndex);
    if (era.kind === "map") mapView.setEra(era, storiesForEra(era.id));
  } catch (err) {
    console.error(err);
    $("#map-status").textContent = "The map couldn't load. Make sure you started GeoStory with npm start, then refresh.";
    $("#map-status").hidden = false;
  }

  if (fromUrl && fromUrl.storyId) store.set({ storyId: fromUrl.storyId, readerOpen: fromUrl.readerOpen });
  if (!fromUrl) showIntro();

  window.addEventListener("pagehide", () => narrator.stop());

  // Shared links: pasting or editing a #era=...&story=... URL jumps there.
  window.addEventListener("hashchange", () => {
    const target = readHash();
    if (!target) return;
    store.set({ eraIndex: target.eraIndex, storyId: target.storyId, readerOpen: target.readerOpen, journalOpen: false });
  });
}

boot();
