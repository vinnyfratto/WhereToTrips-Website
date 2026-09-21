#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   gen-engine-stats.js

   Writes src/_data/engineStats.json — the real size of the Vibe Engine,
   plus the 10 categories and the 24 vibe collections with their photos,
   for /how-it-works/.

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

/* Distinct values of one column. PostgREST has no COUNT(DISTINCT), so this
   pages the column out and counts in JS. Only used on columns small enough
   for that to be cheap (iata, country). */
async function distinctCount(table, column, filter = "") {
  const seen = new Set();
  for (let from = 0; ; from += 1000) {
    const res = await fetch(
      `${SB_URL}/rest/v1/${table}?select=${column}&limit=1000&offset=${from}` + (filter ? `&${filter}` : ""),
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    if (!res.ok) throw new Error(`${table}.${column}: ${res.status}`);
    const page = await res.json();
    for (const r of page) if (r[column]) seen.add(r[column]);
    if (page.length < 1000) break;
  }
  return seen.size;
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
  const [rankingRows, destinations, engineKeys, canonical, shelvesCount, editorialRows] = await Promise.all([
    countOf("vibe_destination_rankings"),
    countOf("destinations", "is_active=is.true"),
    countOf("vibe_keys"),
    countOf("vibe_taxonomy_live"),
    countOf("vibe_shelves", "enabled=is.true"),
    // Rows that name a place we do NOT sell individually. See the note on
    // dest_id in the migration: this is the editorial corpus, and it is the
    // honest answer to "how much is behind one airport code".
    countOf("vibe_destination_rankings", "dest_id=is.null"),
  ]);

  // Distinct gateways and countries, counted the same careful way.
  const gateways = await distinctCount("vibe_destination_rankings", "iata");
  const countries = await distinctCount("destinations", "country", "is_active=is.true");
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
      note: `Across ${blogs.toLocaleString("en-US")} guides, one per travel style per region.`,
      exact: words,
    },
    {
      key: "styles",
      display: withPlus(floorTo(engineKeys, 10)),
      label: "distinct travel styles",
      note: `Grouped into ${canonical} you actually pick from, across ${shelvesCount} collections.`,
      exact: engineKeys,
    },
  ];

  /* ── Per-page stat sets ────────────────────────────────────────────
     /travel-vibes/ and /destinations/ each want their own four numbers,
     so the page picks a set by name (`set: "vibes"`) rather than every
     page printing the same row. */
  const vibesStats = [
    { key: "matches", display: withPlus(floorTo(rankingRows, 1000)), label: "scored vibe matches",
      note: "One row per place per travel style, each with its own score.", exact: rankingRows },
    { key: "styles", display: withPlus(floorTo(engineKeys, 10)), label: "travel styles scored",
      note: "The full vocabulary the engine reasons in, before any of it reaches you.", exact: engineKeys },
    { key: "canonical", display: String(canonical), label: "vibes you actually pick from",
      note: "What those styles collapse into once the near-twins are merged.", exact: canonical },
    { key: "collections", display: String(shelvesCount), label: "collections to browse",
      note: "What those vibes are grouped under, so the picker is a short list and not a wall.", exact: shelvesCount },
  ];

  const destinationsStats = [
    { key: "destinations", display: withPlus(floorTo(destinations, 100)), label: "destinations you can book",
      note: "Each one checked for real hotels, real flights and current advisories.", exact: destinations },
    { key: "countries", display: String(countries), label: "countries and territories",
      note: "Where those destinations are, not where an airline happens to fly.", exact: countries },
    { key: "gateways", display: withPlus(floorTo(gateways, 100)), label: "gateway airports",
      note: "The airport is how you get there. It isn't the thing you're choosing.", exact: gateways },
    { key: "places", display: withPlus(floorTo(editorialRows, 1000)), label: "places scored around them",
      note: "Towns, ruins, coastlines and traditions you reach from those gateways.", exact: editorialRows },
  ];

  /* ── One airport, worked through ───────────────────────────────────
     The /destinations/ page argues that a destination is not an airport
     code, and the fastest way to show that is to open one up. Naples is
     the clearest case in the engine: NAP is how you get there, and what
     it reaches is Pompeii, the Amalfi Coast, Capri, Vesuvius, Ischia and
     two dozen more, each scored separately on its own merits. */
  const GATEWAY_IATA = "NAP";
  const { rows: gwRows } = await sb(
    "vibe_destination_rankings",
    `select=destination,vibe_label,score,tier,note&iata=eq.${GATEWAY_IATA}&order=score.desc`
  );
  // One row per PLACE, its best-scoring vibe, so the list reads as "here is
  // what you can reach" rather than the same coastline eight times.
  const byPlace = new Map();
  for (const r of gwRows) if (!byPlace.has(r.destination)) byPlace.set(r.destination, r);
  const gateway = {
    iata: GATEWAY_IATA,
    city: "Naples",
    country: "Italy",
    totalRows: gwRows.length,
    vibeCount: new Set(gwRows.map((r) => r.vibe_label)).size,
    placeCount: byPlace.size,
    places: [...byPlace.values()].slice(0, 12).map((r) => ({
      place: r.destination,
      vibe:  r.vibe_label,
      score: r.score,
      tier:  r.tier,
      note:  r.note || null,
    })),
  };

  // The ten top-level categories, one photo each. The How It Works hero
  // cycles these, so it is showing the actual top of the taxonomy rather
  // than a stock shot of a laptop.
  const { rows: catRows } = await sb(
    "vibe_categories",
    "select=code,display_name,sort_order,image_1&enabled=is.true&order=sort_order"
  );
  const categories = catRows
    .filter((r) => r.image_1)
    .map((r) => ({ code: r.code, name: r.display_name, image: r.image_1 }));
  if (categories.length < catRows.length) {
    throw new Error(`Categories with no image_1: ${catRows.filter((r) => !r.image_1).map((r) => r.code).join(", ")}`);
  }

  // The 24 vibe collections, with their photos — the picker you see in
  // the app. "Shelf" is the internal word for these; the website calls
  // them collections, because nobody outside the codebase says shelf.
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
  if (missing.length) throw new Error(`Collections with no image: ${missing.join(", ")}`);

  const out = { generated: new Date().toISOString().slice(0, 10), stats, vibesStats, destinationsStats, gateway, categories, shelves };
  const dest = path.join(__dirname, "..", "src", "_data", "engineStats.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");

  for (const s of stats) console.log(`  ✓ ${s.display} ${s.label}  (exact ${s.exact.toLocaleString("en-US")})`);
  console.log(`  ✓ ${gateway.city} (${gateway.iata}): ${gateway.placeCount} places, ${gateway.vibeCount} vibes, ${gateway.totalRows} rows`);
  console.log(`  ✓ ${categories.length} categories, one photo each`);
  console.log(`  ✓ ${shelves.length} collections, ${shelves.reduce((n, s) => n + s.images.length, 0)} photos`);
  console.log(`\nWrote → ${path.relative(process.cwd(), dest)}`);
})().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
