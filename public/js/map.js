/**
 * map.js — the world map.
 *
 * Why pins can't drift any more (the v2 bug): pins are drawn INSIDE the same
 * SVG group as the countries, and their positions come from the same d3
 * projection that draws the borders. Zooming, panning or resizing moves
 * everything together.
 *
 * Layers, bottom to top:
 *   ocean sphere · graticule · land · paper texture · historical borders ·
 *   border labels · thread arcs · ghost pins (other eras) · story pins
 */

import { loadLand, loadBorders } from "./geoData.js";
import { THREADS, WAYPOINTS } from "./content.js";
import { isCompact, isSheet, prefersReducedMotion } from "./util.js";

const d3 = window.d3;

const POLITY_TINTS = ["#d9c08a", "#c9c59b", "#dbb99f", "#d2ae8a", "#e2d0a6", "#c8bd90", "#d7c7a8", "#cdb58f"];
const MAX_LABELS = 14;
// Broad "way of life" regions get labelled only if there is room left.
const GENERIC = /hunter|gatherer|forager|peoples|tribes|cultures|farmers|herders|pastoralists|chiefdoms/i;
const PIN_ZOOM = 2.4; // closest zoom when a story opens
// In small windows (and at a browser zoom of 200%) the default view moves
// closer until the world is at least this wide, instead of shrinking the map,
// while keeping every pin of the era on screen.
const MIN_WORLD_WIDTH = 900;
// Room kept around pins when framing them: the pin is ~34px tall and has a name under it.
const FRAME = { left: 64, right: 64, top: 54, bottom: 34 };
// A linked chapter's label ("Elmina · 1500 CE →") is wider, so it needs more room at the sides.
const FRAME_STORY = { left: 112, right: 112, top: 54, bottom: 40 };
// Pin shape: a teardrop whose tip is the exact place. Made 30% bigger after
// Lab 7 (users did not notice the pins), with the place name written below.
const PIN = { path: "M0,0 C-2.6,-5.2 -10.4,-11.7 -10.4,-19.5 A10.4,10.4 0 1 1 10.4,-19.5 C10.4,-11.7 2.6,-5.2 0,0 Z", headY: -19.5, headR: 10.4 };

const shortPlace = (place) => place.split(",")[0].replace(/\s*\(.*\)/, "");

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pinHtml = (s) => `<strong>${esc(s.title)}</strong><span>${esc(s.place)}</span><em>Click to open this story</em>`;

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export class MapView {
  /**
   * @param {HTMLElement} container
   * @param {{ onPinClick(storyId), onGhostClick(storyId), getCardWidth(): number,
   *           getLeftReserve(): number, getTopReserve(): number }} handlers
   */
  constructor(container, handlers) {
    this.container = container;
    this.handlers = handlers;
    this.width = 0;
    this.height = 0;
    this.k = 1;
    this.era = null;
    this.stories = [];
    this.selected = null; // { story, neighbours }
    this.borders = null;
    this.bordersKey = undefined;
    this.loadToken = 0;
    this.highlightedThread = null;
  }

  async init() {
    const c = this.container;
    this.svg = d3.select(c).append("svg").attr("class", "map-svg").attr("role", "img")
      .attr("aria-label", "World map. Each pin is a story for the selected era.");

    const defs = this.svg.append("defs");
    this.buildPaperPattern(defs);

    this.gZoom = this.svg.append("g").attr("class", "zoom-layer");
    this.gSphere = this.gZoom.append("path").attr("class", "ocean");
    this.gGrat = this.gZoom.append("path").attr("class", "graticule");
    this.gLand = this.gZoom.append("path").attr("class", "land");
    this.gPaper = this.gZoom.append("path").attr("class", "land-paper").attr("fill", "url(#paper)");
    this.gBorders = this.gZoom.append("g").attr("class", "borders");
    this.gLabels = this.gZoom.append("g").attr("class", "polity-labels");
    this.gArcs = this.gZoom.append("g").attr("class", "arcs");
    this.gGhosts = this.gZoom.append("g").attr("class", "ghosts");
    this.gPins = this.gZoom.append("g").attr("class", "pins");
    this.gSphereEdge = this.gZoom.append("path").attr("class", "sphere-edge");

    this.tooltip = d3.select(c).append("div").attr("class", "map-tooltip").attr("role", "status");

    this.zoom = d3.zoom()
      .scaleExtent([1, 10])
      .on("zoom", (event) => this.onZoom(event.transform));
    this.svg.call(this.zoom).on("dblclick.zoom", null);

    this.land = await loadLand();
    this.measure();
    this.renderStatic();

    let resizeTimer;
    new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.measure()) {
          this.renderStatic();
          this.renderBorders(false);
          this.renderPins(false);
          if (this.selected) this.renderThread();
          this.applyView(false); // measure() reset the camera, so frame the era or story again
        }
      }, 120);
    }).observe(c);
  }

  /** Recomputes the projection for the container's current size. Returns true if the size changed. */
  measure() {
    const w = Math.max(320, this.container.clientWidth);
    const h = Math.max(240, this.container.clientHeight);
    if (w === this.width && h === this.height) return false;
    this.width = w;
    this.height = h;
    this.svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);

    const pad = Math.min(w, h) * 0.04;
    this.projection = d3.geoNaturalEarth1().fitExtent([[pad, pad], [w - pad, h - pad]], { type: "Sphere" });

    // On wide screens, slide the world right so the era card (top-left)
    // doesn't hide the Americas, as far as the spare width allows.
    const reserve = this.handlers.getLeftReserve ? this.handlers.getLeftReserve() : 0;
    if (reserve > 0) {
      const [[x0], [x1]] = d3.geoPath(this.projection).bounds({ type: "Sphere" });
      const spare = w - pad - x1; // empty space to the right of the map
      const shift = Math.max(0, Math.min(spare, reserve - x0));
      if (shift > 0) {
        const [tx, ty] = this.projection.translate();
        this.projection.translate([tx + shift, ty]);
      }
    }
    this.path = d3.geoPath(this.projection);
    const [[sx0], [sx1]] = this.path.bounds({ type: "Sphere" });
    this.worldWidth = sx1 - sx0;

    // Allow panning a little past the edges so any pin can be centred.
    this.zoom
      .extent([[0, 0], [w, h]])
      .translateExtent([[-w * 0.3, -h * 0.3], [w * 1.3, h * 1.3]]);
    this.svg.call(this.zoom.transform, d3.zoomIdentity);
    return true;
  }

  renderStatic() {
    const sphere = { type: "Sphere" };
    this.gSphere.attr("d", this.path(sphere));
    this.gSphereEdge.attr("d", this.path(sphere));
    this.gGrat.attr("d", this.path(d3.geoGraticule10()));
    const landPath = this.path(this.land);
    this.gLand.attr("d", landPath);
    this.gPaper.attr("d", landPath);
  }

  buildPaperPattern(defs) {
    // A small noise tile drawn once, used as a subtle paper grain on land.
    const size = 140;
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = 90;
      img.data[i + 1] = 62;
      img.data[i + 2] = 30;
      img.data[i + 3] = v > 200 ? 34 : v > 150 ? 16 : 0;
    }
    ctx.putImageData(img, 0, 0);
    defs.append("pattern").attr("id", "paper").attr("patternUnits", "userSpaceOnUse")
      .attr("width", size).attr("height", size)
      .append("image").attr("href", cv.toDataURL()).attr("width", size).attr("height", size);
  }

  /* -------------------------------------------------- eras -------- */

  /**
   * Shows an era: swaps historical borders (async) and pins (immediately).
   * @param {object} era  waypoint object
   * @param {object[]} stories  stories at this era
   */
  setEra(era, stories) {
    this.era = era;
    this.stories = stories;
    this.selected = null;
    this.gArcs.selectAll("*").remove();
    this.gGhosts.selectAll("*").remove();
    this.hideTooltip();
    this.renderPins(true);

    if (era.borders !== this.bordersKey) {
      this.bordersKey = era.borders;
      const token = ++this.loadToken;
      if (!era.borders) {
        this.borders = null;
        this.renderBorders(true);
      } else {
        loadBorders(era.borders)
          .then((fc) => {
            if (token !== this.loadToken) return; // user already moved on
            this.borders = fc;
            this.renderBorders(true);
          })
          .catch(() => {
            if (token !== this.loadToken) return;
            this.borders = null;
            this.renderBorders(true);
          });
      }
    }
  }

  renderBorders(animate) {
    const fc = this.borders;
    const features = fc ? fc.features : [];
    const t = animate && !prefersReducedMotion() ? 450 : 0;

    const sel = this.gBorders.selectAll("path.polity").data(features, (d, i) => `${this.bordersKey}-${i}`);
    sel.exit().transition().duration(t).style("opacity", 0).remove();
    sel.enter().append("path")
      .attr("class", "polity")
      .attr("fill", (d) => (d.properties.name ? POLITY_TINTS[hash(d.properties.name) % POLITY_TINTS.length] : "transparent"))
      .style("opacity", 0)
      .on("pointermove", (event, d) => d.properties.name && this.showTooltip(event, d.properties.name, "polity"))
      .on("pointerleave", () => this.hideTooltip())
      .merge(sel)
      .attr("d", this.path)
      .transition().duration(t)
      .style("opacity", 1);

    this.renderLabels(features);
  }

  /** Names of the biggest realms of the era, placed without overlapping. */
  renderLabels(features) {
    const named = features
      .filter((f) => f.properties.name)
      .map((f) => ({ f, area: this.path.area(f) }))
      .filter((d) => d.area > 900)
      // Long "way of life" names ("Eastern North American hunter-gatherers") crowd the map and hide pins.
      .filter((d) => !(GENERIC.test(d.f.properties.name) && d.f.properties.name.length > 26))
      .map((d) => ({ ...d, rank: GENERIC.test(d.f.properties.name) ? d.area * 0.25 : d.area }))
      .sort((a, b) => b.rank - a.rank);

    // Treat each pin as an obstacle so realm names never sit under a pin.
    const placed = this.stories.map((st) => {
      const [px, py] = this.projection([st.lon, st.lat]);
      const half = Math.max(16, shortPlace(st.place).length * 3.6 + 6);
      return { x0: px - half, x1: px + half, y0: py - 38, y1: py + 22 };
    });
    const labels = [];
    for (const { f, area } of named) {
      if (labels.length >= MAX_LABELS) break;
      const [x, y] = this.path.centroid(f);
      if (!isFinite(x) || !isFinite(y)) continue;
      const lonlat = this.projection.invert([x, y]);
      if (!lonlat || !d3.geoContains(f, lonlat)) continue; // centroid outside a crescent-shaped realm
      const name = f.properties.name;
      const size = Math.max(10.5, Math.min(14.5, Math.sqrt(area) / 8.5));
      const w = name.length * size * 0.62;
      const box = { x0: x - w / 2 - 4, x1: x + w / 2 + 4, y0: y - size, y1: y + size * 0.4 };
      if (placed.some((b) => !(box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1))) continue;
      placed.push(box);
      labels.push({ name, x, y, size });
    }

    const sel = this.gLabels.selectAll("text").data(labels, (d) => d.name + d.x);
    sel.exit().remove();
    sel.enter().append("text").attr("class", "polity-label")
      .merge(sel)
      .attr("x", (d) => d.x).attr("y", (d) => d.y)
      .style("font-size", (d) => `${d.size / this.k}px`)
      .text((d) => d.name);
  }

  /* -------------------------------------------------- pins -------- */

  renderPins(animate) {
    const reduced = prefersReducedMotion();
    const data = this.stories.map((s, i) => {
      const [x, y] = this.projection([s.lon, s.lat]);
      return { s, x, y, i };
    });

    const sel = this.gPins.selectAll("g.pin").data(data, (d) => d.s.id);
    sel.exit().remove();

    const enter = sel.enter().append("g")
      .attr("class", "pin")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `${d.s.place}: ${d.s.title}`)
      .style("--pin", (d) => THREADS[d.s.thread].color)
      .on("click", (event, d) => this.handlers.onPinClick(d.s.id))
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.handlers.onPinClick(d.s.id);
        }
      })
      .on("pointerenter", (event, d) => this.showTooltip(event, pinHtml(d.s), "pin", true))
      .on("pointermove", (event, d) => this.showTooltip(event, pinHtml(d.s), "pin", true))
      .on("pointerleave", () => this.hideTooltip())
      .on("focus", (event, d) => this.showTooltipAt(d.x, d.y, pinHtml(d.s)))
      .on("blur", () => this.hideTooltip());

    const scale = enter.append("g").attr("class", "pin-scale");
    const body = scale.append("g").attr("class", animate && !reduced ? "pin-body pin-drop" : "pin-body")
      .style("animation-delay", (d) => `${d.i * 110}ms`);
    body.append("ellipse").attr("class", "pin-halo").attr("rx", 14).attr("ry", 5.6);
    // A second ring that pulses around the pin's head, so pins catch the eye.
    body.append("circle").attr("class", "pin-ring").attr("cy", PIN.headY).attr("r", PIN.headR);
    const inner = body.append("g").attr("class", "pin-inner");
    inner.append("circle").attr("class", "pin-hit").attr("cy", -15).attr("r", 21);
    inner.append("path").attr("class", "pin-shape").attr("d", PIN.path);
    inner.append("circle").attr("class", "pin-eye").attr("cy", PIN.headY).attr("r", 4.1);
    body.append("text").attr("class", "pin-label").attr("y", 15).text((d) => shortPlace(d.s.place));

    enter.merge(sel)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .classed("is-selected", (d) => this.selected && this.selected.story.id === d.s.id)
      .classed("is-dimmed", (d) => this.highlightedThread && d.s.thread !== this.highlightedThread)
      .select(".pin-scale").attr("transform", `scale(${1 / this.k})`);
    this.layoutPinLabels();
  }

  /**
   * Place names sit under their pin. When two pins are so close that the
   * names would overlap, the names move to the outer sides of the two pins.
   */
  layoutPinLabels() {
    const pins = this.gPins.selectAll("g.pin");
    const data = pins.data().map((d) => ({ d, x: d.x * this.k, y: d.y * this.k, half: shortPlace(d.s.place).length * 3.6 + 4, side: "below" }));
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const a = data[i], b = data[j];
        if (Math.abs(a.y - b.y) < 44 && Math.abs(a.x - b.x) < a.half + b.half + 6) {
          const [left, right] = a.x <= b.x ? [a, b] : [b, a];
          left.side = "left";
          right.side = "right";
        }
      }
    }
    // Same idea for the dotted circle of a linked chapter that sits right under a pin's name.
    for (const g of this.gGhosts.selectAll("g.ghost").data()) {
      for (const p of data) {
        const dx = g.x * this.k - p.x, dy = g.y * this.k - p.y;
        if (p.side === "below" && Math.abs(dx) < p.half + 14 && dy > -6 && dy < 32) p.side = dx <= 0 ? "right" : "left";
      }
    }
    const side = new Map(data.map((p) => [p.d.s.id, p.side]));
    pins.select(".pin-label")
      .style("text-anchor", (d) => ({ below: "middle", left: "end", right: "start" }[side.get(d.s.id)]))
      .attr("x", (d) => ({ below: 0, left: -15, right: 15 }[side.get(d.s.id)]))
      .attr("y", (d) => (side.get(d.s.id) === "below" ? 15 : -15));
  }

  /** Dims pins that are not part of the given thread (legend hover). */
  highlightThread(threadId) {
    this.highlightedThread = threadId;
    this.gPins.selectAll("g.pin").classed("is-dimmed", (d) => threadId && d.s.thread !== threadId);
  }

  /* -------------------------------------------------- selection -------- */

  /**
   * Selects a story: highlights its pin, draws dotted arcs to the previous
   * and next chapters of its thread (in other eras) and flies to it.
   */
  select(story, neighbours) {
    this.selected = { story, neighbours };
    this.gPins.selectAll("g.pin").classed("is-selected", (d) => d.s.id === story.id);
    this.renderThread();
    this.applyView(true);
  }

  clearSelection() {
    this.selected = null;
    this.gPins.selectAll("g.pin").classed("is-selected", false);
    this.gArcs.selectAll("*").remove();
    this.gGhosts.selectAll("*").remove();
  }

  renderThread() {
    const { story, neighbours } = this.selected;
    const color = THREADS[story.thread].color;
    const links = [neighbours.prev, neighbours.next].filter(Boolean);

    const arcs = links.map((n) => ({
      id: n.id,
      dir: n === neighbours.prev ? "from" : "to",
      d: this.path({ type: "LineString", coordinates: n === neighbours.prev ? [[n.lon, n.lat], [story.lon, story.lat]] : [[story.lon, story.lat], [n.lon, n.lat]] }),
    }));
    this.gArcs.selectAll("path").data(arcs, (d) => d.id).join("path")
      .attr("class", (d) => `thread-arc arc-${d.dir}`)
      .attr("d", (d) => d.d)
      .style("--pin", color);

    // Ghosts only for chapters in OTHER eras (same-era chapters already have a pin).
    const ghosts = links
      .filter((n) => n.waypoint !== story.waypoint)
      .map((n) => {
        const [x, y] = this.projection([n.lon, n.lat]);
        return { n, x, y, isPrev: n === neighbours.prev };
      });
    const when = (n) => (WAYPOINTS.find((w) => w.id === n.waypoint) || {}).short || "";
    const ghostHtml = (d) =>
      `<strong>${esc(d.n.title)}</strong><span>${esc(d.n.place)} · ${esc(when(d.n))}</span><em>${d.isPrev ? "Previous" : "Next"} chapter of this thread · click to go there</em>`;
    const g = this.gGhosts.selectAll("g.ghost").data(ghosts, (d) => d.n.id).join((enter) => {
      const gg = enter.append("g").attr("class", "ghost").attr("tabindex", 0).attr("role", "button");
      const sc = gg.append("g").attr("class", "ghost-scale");
      sc.append("circle").attr("r", 8);
      sc.append("text").attr("class", "ghost-label");
      return gg;
    });
    g.attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("--pin", color)
      .attr("aria-label", (d) => `${d.isPrev ? "Previous" : "Next"} chapter: ${d.n.title}`)
      .on("click", (event, d) => this.handlers.onGhostClick(d.n.id))
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.handlers.onGhostClick(d.n.id);
        }
      })
      // Hovering a linked chapter says what it is before you jump (asked for in the Lab 7 feedback form).
      .on("pointerenter", (event, d) => this.showTooltip(event, ghostHtml(d), "pin", true))
      .on("pointermove", (event, d) => this.showTooltip(event, ghostHtml(d), "pin", true))
      .on("pointerleave", () => this.hideTooltip())
      .on("focus", (event, d) => this.showTooltipAt(d.x, d.y, ghostHtml(d)))
      .on("blur", () => this.hideTooltip());
    g.select(".ghost-scale").attr("transform", `scale(${1 / this.k})`);
    // The label normally sits under its circle. If the chapter is very close to the
    // open story's pin, it moves to the outer side so the two names don't overlap.
    const k = this.storyTransform().k;
    const [sx, sy] = this.projection([story.lon, story.lat]);
    const sideOf = (d) => {
      const dx = (d.x - sx) * k, dy = (d.y - sy) * k;
      if (Math.abs(dx) < 120 && Math.abs(dy) < 40) return dx < 0 ? "left" : "right"; // level with the pin
      if (Math.abs(dx) < 120 && dy < 0 && dy > -110) return "above"; // just above it: stay clear of the pin's head
      return "below";
    };
    g.select(".ghost-label")
      .style("text-anchor", (d) => ({ below: "middle", above: "middle", left: "end", right: "start" }[sideOf(d)]))
      .attr("x", (d) => ({ below: 0, above: 0, left: -14, right: 14 }[sideOf(d)]))
      .attr("y", (d) => ({ below: 24, above: -15, left: 4, right: 4 }[sideOf(d)]))
      .text((d) => {
        const name = `${shortPlace(d.n.place)} · ${when(d.n)}`;
        return d.isPrev ? `← ${name}` : `${name} →`;
      });
  }

  /* -------------------------------------------------- camera -------- */

  /**
   * Points the camera at what matters right now:
   *   a story is open -> the story's pin AND the previous / next chapter of its
   *                      thread, so the dotted links never run off-screen
   *                      (Lab 7, issue H8)
   *   no story        -> the default view of the era (see homeTransform)
   */
  applyView(animate = true) {
    const t = this.selected ? this.storyTransform() : this.homeTransform();
    this.moveTo(t, animate ? (this.selected ? 900 : 700) : 0);
  }

  resetView(animate = true) {
    this.moveTo(this.homeTransform(), animate ? 700 : 0);
  }

  moveTo(transform, duration) {
    const target = prefersReducedMotion() || !duration
      ? this.svg.interrupt()
      : this.svg.transition().duration(duration).ease(d3.easeCubicInOut);
    target.call(this.zoom.transform, transform);
  }

  /** The part of the map area that no panel covers. */
  freeArea() {
    const cardW = this.handlers.getCardWidth ? this.handlers.getCardWidth() : 0;
    const top = this.handlers.getTopReserve ? this.handlers.getTopReserve() : 0;
    // Phone layout: the story card covers the lower part of the map.
    const bottom = this.selected && isSheet() ? this.height * 0.4 : this.height;
    return { x0: 0, y0: Math.min(top, bottom - 120), x1: this.width - cardW, y1: bottom };
  }

  /** A zoom transform that fits the given map points inside the free area. */
  frame(points, { minK = 1, maxK = PIN_ZOOM, pad = FRAME } = {}) {
    const FRAME = pad;
    const area = this.freeArea();
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const [bx0, bx1, by0, by1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const availW = Math.max(60, area.x1 - area.x0 - FRAME.left - FRAME.right);
    const availH = Math.max(60, area.y1 - area.y0 - FRAME.top - FRAME.bottom);
    const fit = Math.min(availW / Math.max(1, bx1 - bx0), availH / Math.max(1, by1 - by0));
    const k = Math.max(minK, Math.min(maxK, fit));
    const cx = (area.x0 + FRAME.left + area.x1 - FRAME.right) / 2;
    const cy = (area.y0 + FRAME.top + area.y1 - FRAME.bottom) / 2;
    const t = d3.zoomIdentity.translate(cx - (k * (bx0 + bx1)) / 2, cy - (k * (by0 + by1)) / 2).scale(k);
    // Stay inside the same limits that dragging the map has, so the view never jumps afterwards.
    return this.zoom.constrain()(t, [[0, 0], [this.width, this.height]], this.zoom.translateExtent());
  }

  /** Camera for an open story: its pin plus the linked chapters of its thread. */
  storyTransform() {
    const { story, neighbours } = this.selected;
    const at = (s) => this.projection([s.lon, s.lat]);
    let t = this.frame([story, neighbours.prev, neighbours.next].filter(Boolean).map(at), { pad: FRAME_STORY });

    // The open story's own pin always wins: nudge it into the clear area if needed.
    const area = this.freeArea();
    const [sx, sy] = t.apply(at(story));
    const dx = Math.max(area.x0 + 40 - sx, 0) || Math.min(area.x1 - 40 - sx, 0);
    const dy = Math.max(area.y0 + FRAME.top - sy, 0) || Math.min(area.y1 - 24 - sy, 0);
    if (dx || dy) t = d3.zoomIdentity.translate(t.x + dx, t.y + dy).scale(t.k);
    return t;
  }

  /**
   * Default camera for an era. "Reset view" returns here.
   *
   * Big windows: the whole world. If a pin would sit under the era card or the
   * Threads panel (both on the left), the world slides right just enough to
   * uncover it.
   *
   * Small windows and browser zoom of 200% (Lab 7, issue A1): showing the whole
   * world would make it tiny, so the camera moves closer, but never so close
   * that a pin of the era is left out.
   */
  homeTransform() {
    if (!this.stories.length) return d3.zoomIdentity;
    const points = this.stories.map((s) => this.projection([s.lon, s.lat]));

    if (!isCompact()) {
      const reserve = this.handlers.getLeftReserve ? this.handlers.getLeftReserve() : 0;
      const xs = points.map((p) => p[0]);
      const need = reserve + 30 - Math.min(...xs);                 // how far the left-most pin is under the panels
      const room = this.width - 90 - Math.max(...xs);              // how far we can go before the right-most pin leaves
      const dx = Math.max(0, Math.min(need, room, this.width * 0.3));
      return dx ? d3.zoomIdentity.translate(dx, 0) : d3.zoomIdentity;
    }

    const want = Math.max(1, MIN_WORLD_WIDTH / this.worldWidth);
    const t = this.frame(points, { maxK: Math.min(want, PIN_ZOOM) });

    // Don't leave an empty band above or below the world: if the map is taller
    // than its area keep it edge to edge, otherwise centre it.
    const [[, y0], [, y1]] = this.path.bounds({ type: "Sphere" });
    const top = y0 * t.k + t.y, bottom = y1 * t.k + t.y;
    let dy = 0;
    if (bottom - top <= this.height) dy = (this.height - (bottom - top)) / 2 - top;
    else if (top > 0) dy = -top;
    else if (bottom < this.height) dy = this.height - bottom;
    return dy ? d3.zoomIdentity.translate(t.x, t.y + dy).scale(t.k) : t;
  }

  zoomBy(factor) {
    this.svg.transition().duration(300).call(this.zoom.scaleBy, factor);
  }

  onZoom(t) {
    this.k = t.k;
    this.gZoom.attr("transform", t);
    this.gPins.selectAll(".pin-scale").attr("transform", `scale(${1 / t.k})`);
    this.gGhosts.selectAll(".ghost-scale").attr("transform", `scale(${1 / t.k})`);
    this.gLabels.selectAll("text").style("font-size", (d) => `${d.size / t.k}px`);
    this.layoutPinLabels();
    this.container.style.setProperty("--k", t.k);
    this.hideTooltip();
  }

  /* -------------------------------------------------- tooltip -------- */

  showTooltip(event, html, kind, isHtml = false) {
    const [mx, my] = d3.pointer(event, this.container);
    this.tooltip.attr("class", `map-tooltip is-visible tt-${kind}`);
    if (isHtml) this.tooltip.html(html);
    else this.tooltip.text(html);
    this.placeTooltip(mx, my);
  }

  showTooltipAt(x, y, html) {
    const t = d3.zoomTransform(this.svg.node());
    const [sx, sy] = t.apply([x, y]);
    this.tooltip.attr("class", "map-tooltip is-visible tt-pin").html(html);
    this.placeTooltip(sx, sy);
  }

  /** Puts the tooltip beside the point, flipped to the other side near an edge. */
  placeTooltip(x, y) {
    const node = this.tooltip.node();
    const w = node.offsetWidth, h = node.offsetHeight;
    const left = x + 16 + w > this.width ? x - 16 - w : x + 16;
    const top = y + 16 + h > this.height ? y - 16 - h : y + 16;
    this.tooltip.style("transform", `translate(${Math.round(Math.max(4, left))}px, ${Math.round(Math.max(4, top))}px)`);
  }

  hideTooltip() {
    if (this.tooltip) this.tooltip.attr("class", "map-tooltip");
  }
}
