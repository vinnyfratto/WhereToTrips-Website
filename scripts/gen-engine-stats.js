#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   gen-engine-stats.js

   Writes src/_data/engineStats.json — the real size of the Vibe Engine,
   plus the 24 vibe shelves and their photos, for /how-it-works/.

   Every number on that page is counted here rather than typed into a
   template, because a marketing stat that quietly goes stale is worse
   than no stat. `display` is the rounded figure the page prints and
   `exact` is what it was rounded from, so the two can always be checked
   against each other.

   Rounding is always DOWN to a round number with a "+", never up:
   2,702,003 words prints as "2.7 million+", never "2.8 million".

   Run it by hand when the engine grows:

       node scripts/gen-engine-stats.js

   then commit the JSON. Same committed-snapshot rule as the other two
   generators: a deploy must not be able to change the page on its own.
   ════════════════════════════════════════════════════════════════════ */

const fs   = require("fs");
const path = require("path");

const { url: SB_URL, anonKey: SB_KEY } = require("../src/_data/supabase.json");

async function sb(table, query, extraHeaders = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${encodeURIComponent(table)}?${query}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, ...extraHeaders },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return { rows: await res.json(), contentRange: res.headers.get("content-range") };
}

/* PostgREST returns the exact row count in Content-Range when asked, so a
   count never has to pull the rows themselves. */
async function countOf(table, filter = "") {
  const { contentRange } = await sb(
    table,
    `select=*&limit=1${filter ? "&" + filter : ""}`,
    { Prefer: "count=exact" }
  );
  const total = (contentRange || "").split("/")[1];
  const n = parseInt(total, 10);
  if (!Number.isFinite(n)) throw new Error(`${table}: no exact count in Content-Range`);
  return n;
}

/* Every word_count, paged out. 2,363 blogs, so this is a handful of calls. */
async function sumBlogWords() {
  let total = 0, blogs = 0;
  for (let from = 0; ; from += 1000) {
    const res = await fetch(
      `${SB_URL}/rest/v1/vibe_blogs?select=word_count&limit=1000&offset=${from}`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    if (!res.ok) throw new Error(`vibe_blogs: ${res.status}`);
    const page = await res.json();
    for (const r of page) total += r.word_count || 0;
    blogs += page.length;
    if (page.length < 1000) break;
  }
  return { total, blogs };
}

/* Round DOWN to `step`, so the "+" is always honest. */
const floorTo = (n, step) => Math.floor(n / step) * step;
const withPlus = (n) => `${n.toLocaleString("en-US")}+`;

(async () => {
  const [rankingRows, destinations, engineKeys, canonical, shelvesCount] = await Promise.all([
    countOf("vibe_destination_rankings"),
    countOf("destinations", "is_active=is.true"),
    countOf("vibe_keys"),
    countOf("vibe_taxonomy_live"),
    countOf("vibe_shelves", "enabled=is.true"),
  ]);
  const { total: words, blogs } = await sumBlogWords();

  const millions = Math.floor(words / 100000) / 10;   // 2,702,003 -> 2.7

  const stats = [
    {
      key: "vibes",
      display: withPlus(floorTo(rankingRows, 1000)),
      label: "scored vibe matches",
      note: "Every destination in the engine, scored against every vibe it genuinely delivers.",
      exact: rankingRows,
    },
    {
      key: "destinations",
      display: withPlus(floorTo(destinations, 100)),
      label: "destinations",
      note: "Real places you can fly to and book, not a list of airports.",
      exact: destinations,
    },
    {
      key: "words",
      display: `${millions} million+`,
      label: "words of destination and vibe writing",
      note: `Across ${blogs.toLocaleString("en-US")} guides, researched by hand rather than generated.`,
      exact: words,
    },
    {
      key: "styles",
      display: withPlus(floorTo(engineKeys, 10)),
      label: "distinct travel styles",
      note: `Grouped into ${canonical} you actually pick from, across ${shelvesCount} shelves.`,
      exact: engineKeys,
    },
  ];

  // The shelves, with their photos — the picker you see in the app.
  const { rows: shelfRows } = await sb(
    "vibe_shelves",
    "select=code,display_name,blurb,sort_order,image_1,image_2,image_3&enabled=is.true&order=sort_order"
  );
  const shelves = shelfRows.map((r) => ({
    code:   r.code,
    name:   r.display_name,
    blurb:  r.blurb || null,
    images: [r.image_1, r.image_2, r.image_3].filter(Boolean),
  }));
  const missing = shelves.filter((s) => !s.images.length).map((s) => s.code);
  if (missing.length) throw new Error(`Shelves with no image: ${missing.join(", ")}`);

  const out = { generated: new Date().toISOString().slice(0, 10), stats, shelves };
  const dest = path.join(__dirname, "..", "src", "_data", "engineStats.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");

  for (const s of stats) console.log(`  ✓ ${s.display} ${s.label}  (exact ${s.exact.toLocaleString("en-US")})`);
  console.log(`  ✓ ${shelves.length} shelves, ${shelves.reduce((n, s) => n + s.images.length, 0)} photos`);
  console.log(`\nWrote → ${path.relative(process.cwd(), dest)}`);
})().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
