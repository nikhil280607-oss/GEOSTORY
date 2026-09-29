/**
 * cosmos.js — the "before the map" view for deep time (Big Bang to first life).
 *
 * There is no geography to show yet, so instead of an empty map we paint a
 * slow, calm sky scene on a canvas: one scene per Big History threshold.
 * With "reduce motion" turned on, a single still frame is drawn.
 */

import { prefersReducedMotion } from "./util.js";

const ELEMENTS = ["C", "O", "Ca", "Fe", "N", "Si"];

export class CosmosView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.scene = null;
    this.running = false;
    this.t0 = performance.now();
    this.stars = [];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.makeStars();
    if (!this.running) this.draw(performance.now());
  }

  makeStars() {
    const count = Math.round((this.w * this.h) / 2600);
    // Seeded so the sky doesn't jump around on resize.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    this.stars = Array.from({ length: count }, () => ({
      x: rnd() * this.w,
      y: rnd() * this.h,
      r: rnd() * 1.2 + 0.2,
      p: rnd() * Math.PI * 2,
      warm: rnd() > 0.8,
    }));
  }

  show(scene) {
    this.scene = scene;
    this.t0 = performance.now();
    this.resize();
    if (prefersReducedMotion()) {
      this.running = false;
      this.draw(this.t0 + 4000);
      return;
    }
    if (!this.running) {
      this.running = true;
      const loop = (now) => {
        if (!this.running) return;
        this.draw(now);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  hide() {
    this.running = false;
  }

  /* ------------------------------------------------------------------ */

  draw(now) {
    const { ctx, w, h } = this;
    if (!w) return;
    const t = (now - this.t0) / 1000;
    ctx.clearRect(0, 0, w, h);

    // Background stars (dimmer in the Big Bang, when there are no stars yet).
    const starAlpha = this.scene === "bang" ? 0.12 : 0.75;
    for (const s of this.stars) {
      const tw = 0.55 + 0.45 * Math.sin(t * 1.3 + s.p);
      ctx.globalAlpha = starAlpha * tw;
      ctx.fillStyle = s.warm ? "#f3d9a4" : "#dfe6ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Scene sits to the right of the caption card on wide screens.
    const cx = w > 900 ? w * 0.66 : w * 0.5;
    const cy = w > 900 ? h * 0.5 : h * 0.62;
    const R = Math.min(w, h) * 0.2;

    const scenes = {
      bang: () => this.drawBang(cx, cy, R, t),
      stars: () => this.drawFirstStars(cx, cy, R, t),
      elements: () => this.drawSupernova(cx, cy, R, t),
      earth: () => this.drawPlanet(cx, cy, R, t, "molten"),
      life: () => this.drawPlanet(cx, cy, R, t, "ocean"),
    };
    (scenes[this.scene] || (() => {}))();
  }

  glow(x, y, r, stops) {
    const g = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    this.ctx.fillStyle = g;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawBang(cx, cy, R, t) {
    const ctx = this.ctx;
    this.glow(cx, cy, R * 2.6, [[0, "rgba(255,244,214,0.95)"], [0.08, "rgba(255,220,150,0.8)"], [0.3, "rgba(226,160,90,0.25)"], [1, "rgba(80,40,90,0)"]]);
    for (let i = 0; i < 4; i++) {
      const phase = ((t * 0.18 + i / 4) % 1);
      ctx.strokeStyle = `rgba(255,214,150,${0.45 * (1 - phase)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.2 + phase * R * 2.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawFirstStars(cx, cy, R, t) {
    const pts = [[0, 0, 1], [-0.9, -0.5, 0.7], [0.8, 0.6, 0.8], [-0.4, 0.9, 0.55], [1.1, -0.7, 0.6], [-1.3, 0.3, 0.45]];
    pts.forEach(([dx, dy, s], i) => {
      const x = cx + dx * R * 1.3;
      const y = cy + dy * R * 1.1;
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.5 + i);
      this.glow(x, y, R * 0.55 * s * pulse, [[0, "rgba(235,245,255,1)"], [0.12, "rgba(170,200,255,0.8)"], [0.4, "rgba(90,120,220,0.18)"], [1, "rgba(40,50,120,0)"]]);
    });
  }

  drawSupernova(cx, cy, R, t) {
    const ctx = this.ctx;
    this.glow(cx, cy, R * 0.5, [[0, "rgba(255,250,235,1)"], [0.3, "rgba(255,200,140,0.6)"], [1, "rgba(255,120,80,0)"]]);
    const shell = R * (1.1 + 0.08 * Math.sin(t * 0.8));
    const g = ctx.createRadialGradient(cx, cy, shell * 0.75, cx, cy, shell * 1.2);
    g.addColorStop(0, "rgba(255,140,90,0)");
    g.addColorStop(0.5, "rgba(236,120,110,0.35)");
    g.addColorStop(0.75, "rgba(130,160,255,0.22)");
    g.addColorStop(1, "rgba(80,60,160,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, shell * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `600 ${Math.round(R * 0.2)}px "Cormorant Garamond", Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ELEMENTS.forEach((sym, i) => {
      const a = t * 0.12 + (i / ELEMENTS.length) * Math.PI * 2;
      const rr = shell * (1.35 + 0.05 * Math.sin(t + i));
      ctx.fillStyle = "rgba(233,203,130,0.92)";
      ctx.fillText(sym, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8);
    });
  }

  drawPlanet(cx, cy, R, t, kind) {
    const ctx = this.ctx;
    const molten = kind === "molten";
    this.glow(cx, cy, R * 1.6, molten
      ? [[0.55, "rgba(255,120,50,0.25)"], [1, "rgba(255,90,40,0)"]]
      : [[0.55, "rgba(90,170,255,0.25)"], [1, "rgba(60,120,255,0)"]]);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    const base = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
    if (molten) {
      base.addColorStop(0, "#ffcf7a");
      base.addColorStop(0.45, "#e0652b");
      base.addColorStop(1, "#5a1a10");
    } else {
      base.addColorStop(0, "#9fd4ff");
      base.addColorStop(0.5, "#2c6fb3");
      base.addColorStop(1, "#0a2244");
    }
    ctx.fillStyle = base;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    // Drifting bands: magma cracks or cloud streaks.
    for (let i = 0; i < 7; i++) {
      const yy = cy - R + ((i + 0.5) / 7) * R * 2;
      const off = Math.sin(t * 0.35 + i * 1.7) * R * 0.3;
      ctx.strokeStyle = molten ? "rgba(255,210,120,0.28)" : "rgba(255,255,255,0.18)";
      ctx.lineWidth = R * (molten ? 0.025 : 0.05);
      ctx.beginPath();
      ctx.moveTo(cx - R + off, yy);
      ctx.bezierCurveTo(cx - R * 0.3 + off, yy - R * 0.12, cx + R * 0.3 + off, yy + R * 0.12, cx + R + off, yy);
      ctx.stroke();
    }
    // Night side shadow.
    const shade = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    shade.addColorStop(0.45, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,10,0.65)");
    ctx.fillStyle = shade;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    if (molten) {
      // The young Moon, freshly formed after a giant impact.
      const a = t * 0.08;
      const mx = cx + Math.cos(a) * R * 1.9;
      const my = cy + Math.sin(a) * R * 0.5 - R * 0.2;
      this.glow(mx, my, R * 0.2, [[0, "#e8ddd0"], [0.8, "#9a8e84"], [1, "rgba(154,142,132,0)"]]);
    }
  }
}
