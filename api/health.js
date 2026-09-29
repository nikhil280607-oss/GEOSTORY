/** api/health.js — Vercel version of GET /api/health (tells the page whether AI is on). */
import { isConfigured } from "../lib/chronicler.js";

export default function handler(req, res) {
  res.status(200).json({ ai: isConfigured() });
}
