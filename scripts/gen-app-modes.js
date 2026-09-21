#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   gen-app-modes.js

   Writes src/_data/appModes.json — the four ways to use the app, as the
   home page's "Four ways in" section renders them.

   The tiles are a web port of the app's own dashboard tiles (app/index.tsx,
   PhotoTile), down to the photo set: each mode pulls from the SAME
   `Dashboard_Images-*` table the app reads, so the website and the phone
   show the same rotation rather than a separate pile of stock photos.

   Run it by hand when the photos or the modes change:

       node scripts/gen-app-modes.js

   then commit the regenerated JSON. Same reasoning as
   gen-featured-vibes.js: a committed snapshot, not a build-time fetch,
   so a deploy can never fail or silently change the home page because of
   a network blip.
   ════════════════════════════════════════════════════════════════════ */

const fs   = require("fs");
const path = require("path");

const { url: SB_URL, anonKey: SB_KEY } = require("../src/_data/supabase.json");

/* `table` and `short` are copied from the app's own dashboard card rows
   (app/index.tsx, DEFAULT_CARDS) so the two stay in step. `body` is the
   longer website-only explanation. The app draws WhereTo: Explore from
   `Dashboard_Images-BudgetVibes` — the table predates the rename. */
const MODES = [
  {
    key:   "discover",
    title: "WhereTo: Discover",
    table: "Dashboard_Images-Discover",
    href:  "/whereto/discover/",
    short: "A few fun taps and your trip comes into focus",
    body:
      "Pick a few vacation types, like Beach & Water, Nature & Outdoors or Health & Wellness. " +
      "Add your home airport, dates, budget and who's coming. We show you the vibes that fit what " +
      "you've picked so far, and you choose what you want to do and experience. The Vibe Engine runs " +
      "all of that against 12,000+ vibes across 900+ destinations worldwide and hands you a ranked, " +
      "priced shortlist of places, not airports. You start with a mood and end with a destination.",
  },
  {
    key:   "explore",
    title: "WhereTo: Explore",
    table: "Dashboard_Images-BudgetVibes",
    href:  "/whereto/explore/",
    short: "Let your vibe carry you to exciting new places",
    body:
      "For when you know the general area. Say you're thinking Europe, The Mediterranean; we show you " +
      "the vibes that region offers, you pick yours, and the engine finds and scores the destinations " +
      "that match your trip. The results come back ranked on your input, and we show you the math.",
  },
  {
    key:   "direct",
    title: "WhereTo: Direct",
    table: "Dashboard_Images-Direct",
    href:  "/whereto/direct/",
    short: "Know where you are going? Head straight there",
    body:
      "For when you already know. Type in where, when and what you want to spend, then go straight to " +
      "flights and hotels. No detours.",
  },
  {
    key:   "together",
    title: "Wander Together",
    table: "Dashboard_Images-WanderTogether",
    href:  "/wander/together/",
    short: "Everyone picks their own vibes, one trip emerges",
    body:
      "For the group chat that never decides anything. Everyone sets their own budget and their own " +
      "vibes. The app finds where you all overlap and shows those destinations, scored for the group. " +
      "Everyone votes in real time to narrow it down and pick the one. From there, one person can pay " +
      "for the whole trip (think family vacation), or each traveler can pay their own way (think long " +
      "weekend in the Caribbean with the girls). All in the app, all in real time. No spreadsheet. No mess.",
  },
];

async function sb(table, query) {
  const res = await fetch(`${SB_URL}/rest/v1/${encodeURIComponent(table)}?${query}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

(async () => {
  const out = [];

  for (const mode of MODES) {
    const rows = await sb(mode.table, "select=image_url,destination,sort_order&order=sort_order");
    const images = rows.filter((r) => r.image_url).map((r) => r.image_url);
    if (!images.length) throw new Error(`${mode.table} has no images`);

    // The app renders the LAST word of the title in azure bold italic and
    // the rest in charcoal regular. Split it here so the template does not
    // have to do string surgery Nunjucks is bad at.
    const words  = mode.title.trim().split(/\s+/);
    const accent = words.pop();

    out.push({
      key:   mode.key,
      title: mode.title,
      titleLead:   words.join(" "),
      titleAccent: accent,
      href:  mode.href,
      short: mode.short,
      body:  mode.body,
      images,
    });

    console.log(`  ✓ ${mode.title} — ${images.length} images from ${mode.table}`);
  }

  const dest = path.join(__dirname, "..", "src", "_data", "appModes.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${out.length} modes → ${path.relative(process.cwd(), dest)}`);
})().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
