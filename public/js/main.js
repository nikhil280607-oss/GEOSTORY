/**
 * main.js — starts GeoStory and connects the pieces.
 *
 * The flow is always: user action -> store.set(...) -> render(). Nothing
 * talks to anything else directly, which keeps the modules independent.
 *
 *   Timeline ─┐                    ┌─> MapView / CosmosView
 *   Map pins ─┤                    ├─> EraCard
 *   Card nav ─┼─> store.set() ─────┼─> StoryCard / Reader
 *   Threads  ─┤                    ├─> ThreadsPanel
 *   Search   ─┤                    └─> URL (#era=...&story=...)
 *   Journal  ─┘
 */

import { store } from "./store.js";
import { WAYPOINTS, getEra, getEraIndex, getStory, storiesForEra, threadNeighbours } from "./content.js";
import { MapView } from "./map.js";
import { CosmosView } from "./cosmos.js";
import { Timeline } from "./timeline.js";
import { EraCard } from "./eraCard.js";
import { StoryCard } from "./storyCard.js";
import { Reader } from "./reader.js";
import { journal, JournalPanel } from "./journal.js";
import { narrator } from "./narrator.js";
import { checkAi } from "./askBox.js";
import { ThreadsPanel } from "./threadsPanel.js";
import { SearchBox } from "./search.js";
import { HelpPage } from "./help.js";
import { $, el, icon, isCompact } from "./util.js";

const stage = $("#stage");
const eraCardEl = $("#era-card");

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
  // On big screens the world slides right to clear the era card. In small
  // windows the era card is only a small chip, so nothing needs to move.
  getLeftReserve: () => (isCompact() ? 0 : 390),
  // When the era card is a chip along the top, pins are framed below it.
  getTopReserve: () => (isCompact() || stage.classList.contains("has-story") ? eraCardEl.offsetHeight + 22 : 0),
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
const threadsPanel = new ThreadsPanel($("#legend"), {
  onGoToStory: goToStory,
  onHighlight: (threadId) => mapView.highlightThread(threadId),
});
const help = new HelpPage($("#intro"), {
  onEnter(firstVisit) {
    if (!firstVisit) return;
    // First visit: hand the keyboard to the timeline and point at it once.
    setTimeout(() => {
      $(".tl-track").focus({ preventScroll: true });
      timeline.showHint();
    }, 450);
  },
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
      // Make room first (era card and Threads shrink), then frame the pins in the space that's left.
      stage.classList.add("has-story");
      threadsPanel.setStory(s.id);
      storyCard.open(s);
      if (mapReady) mapView.select(s, threadNeighbours(s));
    } else if (prev.storyId) {
      storyCard.close();
      stage.classList.remove("has-story");
      threadsPanel.setStory(null);
      if (mapReady) {
        mapView.clearSelection();
        mapView.resetView(); // back to the view that shows every pin of this era
      }
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

/* ------------------------------------------------------------------ header and map buttons */

let searchBox;

function buildHeader() {
  const searchRoot = el("div", { class: "search", role: "search" });
  searchBox = new SearchBox(searchRoot, { onGoToStory: goToStory, onGoToEra: goToEra });

  const helpBtn = el("button", { class: "btn btn-ghost hdr-help", type: "button", "aria-label": "Help: what GeoStory is and how to use it", onclick: () => help.open(false) },
    icon("help"), el("span", { class: "hdr-label" }, "Help"));

  const count = el("span", { class: "jr-count" }, journal.count());
  const journalBtn = el("button", { class: "btn btn-ghost hdr-journal", type: "button", onclick: () => store.set({ journalOpen: true }) },
    icon("bookmark"), el("span", { class: "hdr-label" }, "Journal"), count);
  journal.subscribe((list) => {
    count.textContent = list.length;
    journalBtn.classList.remove("bump");
    void journalBtn.offsetWidth; // restart the little "saved" animation
    journalBtn.classList.add("bump");
  });

  $("#header-actions").append(searchRoot, helpBtn, journalBtn);
}

/**
 * Map buttons. Each has a visible label on hover and on keyboard focus
 * (Lab 7, issue H6: nobody could tell what the old globe icon did).
 */
function buildZoom() {
  const button = (name, label, onclick) =>
    el("button", { class: "icon-btn zoom-btn", type: "button", "aria-label": label, "data-tip": label, onclick, html: icon(name).innerHTML });
  $("#zoom-controls").append(
    button("plus", "Zoom in", () => mapView.zoomBy(1.6)),
    button("minus", "Zoom out", () => mapView.zoomBy(1 / 1.6)),
    button("reset", "Reset view", () => mapView.resetView()));
}

/* ------------------------------------------------------------------ keyboard */

document.addEventListener("keydown", (e) => {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
  if (help.isOpen) return;
  const s = store.get();

  if (e.key === "/" && !s.readerOpen && !s.journalOpen) {
    e.preventDefault();
    searchBox.focus();
    return;
  }

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
    if (era.kind === "map") {
      mapView.setEra(era, storiesForEra(era.id));
      mapView.resetView(false);
    }
  } catch (err) {
    console.error(err);
    $("#map-status").textContent = "The map couldn't load. Make sure you started GeoStory with npm start, then refresh.";
    $("#map-status").hidden = false;
  }

  if (fromUrl && fromUrl.storyId) store.set({ storyId: fromUrl.storyId, readerOpen: fromUrl.readerOpen });
  if (!fromUrl) help.open(true); // a new visitor starts on the Help page

  window.addEventListener("pagehide", () => narrator.stop());

  // Shared links: pasting or editing a #era=...&story=... URL jumps there.
  window.addEventListener("hashchange", () => {
    const target = readHash();
    if (!target) return;
    store.set({ eraIndex: target.eraIndex, storyId: target.storyId, readerOpen: target.readerOpen, journalOpen: false });
  });
}

boot();
