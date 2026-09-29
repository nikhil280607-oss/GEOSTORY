/**
 * askBox.js — the "Ask the Chronicler" box (used in the story card and the
 * full chronicle).
 *
 * It sends only { storyId, question } to our own server at /api/ask. The
 * server looks up the story text itself and calls Gemini with the secret key,
 * so the key never reaches the browser.
 */

import { el, icon } from "./util.js";

let aiStatus = null; // Promise<boolean>

/** Asks the server once whether a Gemini key is configured. */
export function checkAi() {
  if (!aiStatus) {
    aiStatus = fetch("api/health")
      .then((r) => (r.ok ? r.json() : { ai: false }))
      .then((d) => Boolean(d.ai))
      .catch(() => false);
  }
  return aiStatus;
}

export function createAskBox(story, { compact = false } = {}) {
  const box = el("section", { class: `ask ${compact ? "ask-compact" : ""}`, "aria-label": "Ask the Chronicler" });
  const answer = el("div", { class: "ask-answer", "aria-live": "polite" });
  const input = el("input", {
    class: "ask-input", type: "text", maxlength: "300",
    placeholder: "Ask anything about this story…", "aria-label": "Your question",
  });
  const sendBtn = el("button", { class: "ask-send", type: "submit", "aria-label": "Ask", html: icon("send").innerHTML });
  const error = el("p", { class: "ask-error", role: "alert" });
  const form = el("form", { class: "ask-form" }, input, sendBtn);

  const chips = el("div", { class: "ask-chips" },
    (story.suggestions || []).map((q) =>
      el("button", { class: "chip", type: "button", onclick: () => { input.value = q; submit(); } }, q)));

  box.append(
    el("div", { class: "ask-head" },
      el("span", { class: "ask-icon", html: icon("sparkle").innerHTML }),
      el("div", {},
        el("p", { class: "ask-title" }, "Ask the Chronicler"),
        el("p", { class: "ask-sub" }, "Answers come only from this story's text and sources."))),
    chips, form, error, answer);

  input.addEventListener("input", () => { error.textContent = ""; });

  async function submit(e) {
    if (e) e.preventDefault();
    const q = input.value.trim();
    if (q.length < 3) {
      error.textContent = "Type a question first.";
      input.focus();
      return;
    }
    error.textContent = "";
    box.classList.add("is-loading");
    sendBtn.disabled = true;
    answer.replaceChildren(el("p", { class: "ask-q" }, q), el("p", { class: "ask-thinking" }, "Looking through the pages", el("span", { class: "dots" })));
    try {
      const res = await fetch("api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id, question: q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The Chronicler couldn't answer right now.");
      answer.replaceChildren(
        el("p", { class: "ask-q" }, q),
        el("p", { class: "ask-a" }, data.answer),
        el("p", { class: "ask-note" }, "AI answer, based on this chronicle. It can still make mistakes, so check the sources."));
      input.value = "";
    } catch (err) {
      answer.replaceChildren();
      error.textContent = err.message;
    } finally {
      box.classList.remove("is-loading");
      sendBtn.disabled = false;
    }
  }
  form.addEventListener("submit", submit);

  // If no key is set up, explain instead of offering a box that can't work.
  checkAi().then((on) => {
    if (on) return;
    box.classList.add("is-off");
    input.disabled = true;
    sendBtn.disabled = true;
    chips.querySelectorAll("button").forEach((b) => (b.disabled = true));
    error.textContent = "";
    answer.replaceChildren(el("p", { class: "ask-offline" },
      "The Chronicler is resting. To turn it on, add a free Gemini API key to the .env file and restart the server (see README)."));
  });

  return box;
}
