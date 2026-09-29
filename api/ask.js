/**
 * api/ask.js — Vercel serverless version of  POST /api/ask.
 * Same logic as the local server (lib/chronicler.js). Set GEMINI_API_KEY in
 * the Vercel project's Environment Variables.
 */
import { askChronicler } from "../lib/chronicler.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const result = await askChronicler(body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.status ? err.message : "Something went wrong on the server." });
  }
}
