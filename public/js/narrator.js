/**
 * narrator.js — "Listen": reads text aloud with the browser's built-in
 * speech (Web Speech API). Free, no API key, works offline in most browsers.
 */

let current = null;

export const narrator = {
  supported: typeof window !== "undefined" && "speechSynthesis" in window,

  isSpeaking: () => current !== null,

  /** Speaks a list of paragraphs in order. onEnd runs when finished or stopped. */
  speak(paragraphs, onEnd) {
    this.stop();
    if (!this.supported) return;
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => /en-GB/i.test(v.lang) && /natural|google|daniel|serena/i.test(v.name)) ||
      voices.find((v) => /^en/i.test(v.lang)) || null;

    const token = {};
    current = token;
    const queue = paragraphs.filter(Boolean);
    const next = () => {
      if (current !== token) return;
      const text = queue.shift();
      if (!text) {
        current = null;
        onEnd && onEnd();
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 0.96;
      u.pitch = 1;
      u.onend = next;
      u.onerror = () => {
        if (current === token) { current = null; onEnd && onEnd(); }
      };
      synth.speak(u);
    };
    next();
    this.onStop = onEnd;
  },

  stop() {
    if (!this.supported) return;
    const had = current !== null;
    current = null;
    window.speechSynthesis.cancel();
    if (had && this.onStop) {
      const cb = this.onStop;
      this.onStop = null;
      cb();
    }
  },
};
