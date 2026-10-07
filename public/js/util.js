/** util.js — small shared helpers. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Creates an element: el("button", { class: "x", onclick: fn }, "text", child) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style" && typeof v === "object") {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith("--")) node.style.setProperty(prop, val); // custom properties need setProperty
        else node.style[prop] = val;
      }
    }
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Layout modes. The same two rules are used in the CSS (see "small windows"
 * in app.css), so the code and the styles always agree.
 *
 *   compact -> a small window, or a normal window at a browser zoom of ~175%
 *              and above: panels shrink to chips and buttons.
 *   sheet   -> narrow AND tall (a phone held upright): the story card comes
 *              up from the bottom instead of sliding in from the right.
 */
export const LAYOUT = {
  compact: window.matchMedia("(max-width: 900px), (max-height: 560px)"),
  sheet: window.matchMedia("(max-width: 900px) and (max-aspect-ratio: 5/4)"),
};
export const isCompact = () => LAYOUT.compact.matches;
export const isSheet = () => LAYOUT.sheet.matches;

/** Lower-case and strip accents, so "Gobekli" finds "Göbekli". */
export const fold = (text) => String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** localStorage that never throws (private windows, blocked storage, etc.). */
export const safeStorage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: the app still works, it just won't remember */
    }
  },
};

/** Small icon set (inline SVG strings), so no icon font is needed. */
export const ICONS = {
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H6M11 6l-6 6 6 6"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5S9.4 5.9 12 3.5z"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2zM12 6.5v14"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12l15-7-5 15-2.5-6.5z"/></svg>',
  thread: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="17" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="19" cy="15" r="2"/><path d="M6.4 15.6l4.2-6.2M13.6 9.2l4 4.6" stroke-dasharray="2 2.2"/></svg>',
  keyboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="18" height="11" rx="2"/><path d="M7 10.5h.01M10 10.5h.01M13 10.5h.01M16 10.5h.01M8 14h8"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 1.9M12 16.6h.01"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.2"/><path d="M15.6 15.6L20 20"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2L17.5 7M10 10.5v5.5M14 10.5v5.5"/></svg>',
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5L4 9l4 4"/><path d="M4 9h10a5.5 5.5 0 0 1 0 11h-3"/></svg>',
  // "Reset view": four corners closing in on the centre (the old globe icon was unclear).
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4.5h4.5M20 9V4.5h-4.5M4 15v4.5h4.5M20 15v4.5h-4.5"/><circle cx="12" cy="12" r="2.4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  chevronUp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15l7-7 7 7"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>',
};

export function icon(name, cls = "icon") {
  const span = document.createElement("span");
  span.className = cls;
  span.innerHTML = ICONS[name] || "";
  return span;
}

/**
 * Image with a graceful fallback, so a missing photo never shows a broken icon.
 *   fallback: "hide"  -> remove the whole <figure> (story cards, chapter photos)
 *             "decor" -> keep the space and show the GeoStory mark instead (hero)
 */
export function safeImage({ src, alt, className = "", fallback = "hide" }) {
  const wrap = el("div", { class: `img-frame ${className}` });
  const img = el("img", { src, alt, loading: "lazy", decoding: "async" });
  img.addEventListener("error", () => {
    if (fallback === "hide") {
      (wrap.closest("figure") || wrap).remove();
      return;
    }
    wrap.classList.add("img-failed");
    img.remove();
    wrap.append(el("img", { class: "img-failed-mark", src: "img/logo.svg", alt: "" }));
  });
  img.addEventListener("load", () => wrap.classList.add("img-loaded"));
  wrap.append(img);
  return wrap;
}
