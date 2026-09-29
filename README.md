# GeoStory

*A spatiotemporal journey through human history.* HCI & Visualization course project by Nikhil Varma (2024AIB1350) and Dhruva Kumar (2024EEB1196).

You drag the timeline, pins appear on a historical world map, and each pin opens a short story. Stories are linked into **threads** that run across eras, so you can follow one idea through time.

---

## 1. Run it on your laptop (about 5 minutes)

**You need Node.js once.** Download the "LTS" version from https://nodejs.org and install it with the default options.

1. Unzip `geostory-v3.zip` somewhere, for example your Desktop.
2. Open a terminal **inside the `geostory-v3` folder**:
   - Windows: open the folder in File Explorer, click the address bar, type `cmd`, press Enter.
   - Mac: right-click the folder → *New Terminal at Folder*.
3. Type this and press Enter:
   ```
   npm start
   ```
4. Open **http://localhost:5173** in your browser.

There is nothing to install with npm: the project has no dependencies.

To stop the server, press `Ctrl + C` in the terminal.

> Double-clicking `index.html` will **not** work (browsers block the code from loading that way). Always use `npm start`.

## 2. Turn on "Ask the Chronicler" (Gemini)

1. Go to https://aistudio.google.com/app/apikey, sign in with a Google account and click **Create API key**. Copy it.
2. In the `geostory-v3` folder, make a copy of `.env.example` and rename the copy to `.env`
   (Windows: if you can't see the file, in File Explorer choose *View → Show → File name extensions*).
3. Open `.env` in Notepad and paste your key after `GEMINI_API_KEY=` so it looks like:
   ```
   GEMINI_API_KEY=AIzaSy...your key...
   ```
4. Stop the server (`Ctrl + C`) and run `npm start` again. The terminal should say
   `Ask the Chronicler: ON`.

**Keep the key private.** Don't put it in the slides or send `.env` to anyone. It is only read by the server; the browser never sees it.

If Google retires the default model, the Ask box will say "model wasn't found". Change `GEMINI_MODEL` in `.env` to a current model name from https://ai.google.dev/gemini-api/docs/models and restart.

## 3. Put it online (optional, for demoing from a link)

1. Create a free account at https://vercel.com (sign in with GitHub).
2. Put this folder in a GitHub repository (GitHub Desktop is easiest). `.env` is already excluded by `.gitignore`, so your key won't be uploaded.
3. In Vercel: **Add New → Project**, choose the repository, and click **Deploy**. No build settings are needed.
4. In the Vercel project: **Settings → Environment Variables**, add `GEMINI_API_KEY` with your key, then **Deployments → Redeploy**.

Vercel gives you a link like `https://geostory-yourname.vercel.app`.

---

## What's in it

| Feature | Where |
|---|---|
| Timeline from the Big Bang to today, in 17 stops following the 8 "thresholds" of Big History (David Christian) | bottom of the screen; drag it, click a stop, use ← → keys, or the arrows on each side |
| Deep time (Big Bang → first life) shown as animated sky scenes, because there is no map yet | stops 1–5 |
| Real world map with **historical borders** for each era (empires and cultures of that time) | stops 6–17 |
| Pins that drop in, glow, and fly the map to the story when clicked | map |
| Story card: place, era, image, story, sources | slides in from the right |
| **Threads**: dotted arcs link a story to its previous and next chapter; "Continue the thread" jumps there | story card, legend at bottom-left |
| **Full chronicle** (Mansa Musa, 1324): six short chapters, pull quotes, a route map that follows the chapter you're reading, "Myth or fact?", "Then and now", sources | "Read the full chronicle" |
| **Ask the Chronicler** (Gemini): answers only from the story's own text, says so when the story doesn't cover something | story card and chronicle |
| **Listen**: reads the story aloud with the browser's built-in voice (free, no key) | story card and chronicle |
| **Journal** (archive): saved stories grouped by thread, kept in the browser | header |
| Shareable links: the address bar always points to the current era/story | URL |

Stories without a full chronicle show "Full chronicle (in construction)", on purpose not a button that does nothing.

## Threads (how stories connect)

| Thread | Chapters |
|---|---|
| The human story | Chicxulub (66 m) → Jebel Irhoud (300 k) → Göbekli Tepe (9500 BCE) → Uruk (3000 BCE) |
| Ideas that travel | Giza (3000 BCE) → Athens (500 BCE) → Baghdad (800) → Mainz (1500) → CERN (today) |
| The Silk Roads | Persepolis (500 BCE) → Chang'an (1 CE) → Rome (1 CE) → Samarkand (800) → Khanbaliq (1300) → Calicut (1500) |
| Gold and salt | Koumbi Saleh (800) → **Mansa Musa, Timbuktu (1300)** → Elmina (1500) → Johannesburg (1900) |
| Engines of change | Manchester (1800) → Detroit (1900) → Shenzhen (today) |

The thread structure follows widely used world histories: Frankopan, *The Silk Roads* (2015); Gomez, *African Dominion* (2018); Christian, *Maps of Time* (2004). Each story lists its own sources.

---

## How the code is organised

```
server.js              local web server + /api endpoints (no dependencies)
lib/chronicler.js      Ask the Chronicler: builds the story context, calls Gemini (server only)
api/                   the same endpoints for Vercel
public/
  index.html
  css/                 base (tokens, fonts), app (layout, map, timeline), story, reader, panels
  js/
    main.js            starts the app; user action → store → render
    store.js           single app state { eraIndex, storyId, readerOpen, journalOpen }
    content.js         lookups over the data files
    map.js             world map, historical borders, pins, thread arcs, zoom
    geoData.js         loads and caches map files
    geoClean.js        repairs border shapes before drawing
    cosmos.js          deep-time sky scenes
    timeline.js        the time slider (keyboard and screen-reader friendly)
    eraCard.js         era title panel
    storyCard.js       story card
    reader.js          full chronicle view
    journal.js         saved stories
    askBox.js          Ask the Chronicler UI
    narrator.js        read aloud
  data/
    waypoints.js       the 17 timeline stops
    threads.js         the 5 threads
    stories.js         22 stories with coordinates and sources
    chronicles/        full chronicles (Mansa Musa)
    geo/               simplified map files (made by scripts/build-geo.mjs)
scripts/
  check-content.mjs    automated content test
  test-layout.mjs      automated screen-size test
  build-geo.mjs        one-time map data preparation
```

To add a story: add an object to `public/data/stories.js` with a `waypoint`, `thread`, `order`, `lat`/`lon` and `sources`, then run `npm run check`.

## Testing

- `npm run check` checks that **every pin is on land** (using the same land shapes the map draws), every border map draws correctly, threads are numbered without gaps, and every story has sources. This test exists because v2 had pins in the ocean.
- `npm run test:layout` opens the site in a headless browser at 1366×768, 1920×1080 at 125% and 150% Windows scaling, 1920 and a phone, and checks there is **no scrolling**, **no story card before a pin is clicked**, all pins are inside the map, the thread and chronicle flows work, and there are no JavaScript errors. It saves screenshots to `test-output/`. It needs Playwright (`npm i -D playwright && npx playwright install chromium`).

## What v3 fixed from v2

| v2 problem | Cause | Fix |
|---|---|---|
| Pins in the ocean or off the map | Pins were positioned as % of the screen, but the map kept its own shape and was centred, so they drifted apart | Pins are drawn inside the map's SVG with the same projection as the borders, so they move together; `npm run check` verifies every pin is on land |
| Empty story card visible, sideways scrolling | The hidden card was pushed off-screen to the right and widened the page | The page can't scroll; the card only exists after a pin is clicked |
| Vertical scrolling at 125–150% scaling | Fixed pixel heights for header/map/timeline | A flexible one-screen grid, plus compact styles for short screens; tested at those scalings |

## Credits and licences

- Map land: Natural Earth (public domain).
- Historical borders: [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik and contributors (GPL-3.0). Borders are approximate.
- Map rendering: D3 (ISC) and topojson-client (ISC), included in `public/vendor`.
- Fonts: Cormorant Garamond, Spectral and Manrope (SIL Open Font Licence), in `public/fonts`.
- Images: Wikimedia Commons, credited under each image and loaded from Wikimedia (needs internet; if an image can't load, it's hidden).
