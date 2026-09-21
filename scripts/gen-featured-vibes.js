#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   gen-featured-vibes.js

   Writes src/_data/featuredVibes.json — the six "Featured Travel Vibes"
   cards on the home page, and the per-destination Explore pages behind
   them (/featured-vibes/<slug>/).

   Everything here is real Vibe Engine data pulled from Supabase:
     - the vibe + its ranking row for that destination (score, tier, note)
     - the destination's OTHER ranked vibes (the Explore page's vibe list)
     - the full sub-region blog for that vibe (vibe_blogs.body, markdown)
     - every stock image on file for that destination (cards cycle them)

   Run it by hand whenever the picks change or the engine is re-scored:

       node scripts/gen-featured-vibes.js

   then commit the regenerated JSON. Deliberately NOT a build-time fetch:
   a GitHub Actions deploy shouldn't be able to fail (or silently change
   the home page) because of a network blip or a re-ranking pass.

   NOTE on `displayScore`: the card's Vibe Score stamp is a fixed
   marketing number in the 91–97 band, not the engine's raw score. The
   raw score rides along as `engineScore` so the two never get confused.
   ════════════════════════════════════════════════════════════════════ */

const fs   = require("fs");
const path = require("path");

const { url: SB_URL, anonKey: SB_KEY } = require("../src/_data/supabase.json");

/* ── The picks ───────────────────────────────────────
   Six top-tier vibes deliberately matched to the destination people
   DON'T think of first. `insteadOf` is the hook line on the card.

   Every pick has to carry a DEPTH of ranked vibes, not just one good
   one — the Explore page's vibe list is the proof the engine is real,
   and a destination with two rows makes it look thin.

   Crete was the lesson, and the lesson was about THIS FILE, not the
   engine. An earlier version of this script counted a destination's
   vibes through `vibe_destination_rankings.dest_id`, saw two rows for
   Heraklion, and got Crete dropped from the six. That column is the
   wrong lens. It is the EDITORIAL link — "this row names a place we
   sell individually" — and it is null for 8,338 of the 12,936 ranking
   rows BY DESIGN, because the rankings are a corpus of places you
   reach from a gateway, not a list of gateways. Rows like "The Diktean
   cave" and "Cretan raki & tsikoudia" are correctly unlinked. The app
   matches on `iata` (src/lib/vibeRankings.ts) and so does this script
   now. Heraklion carries 19 ranked vibes, not two.

   `state` exists only for US picks. The engine has no state column
   (`vibe_destination_rankings.admin_area` reads "United States" for
   almost every US row), and a US card must never say "United States"
   — it says Georgia. One pick, one hand-checked value. */
const PICKS = [
  {
    slug: "oaxaca-artisan-craft-workshops",
    city: "Oaxaca", country: "Mexico",
    vibeKey: "artisan_craft_workshops", subregion: "Mexico",
    displayScore: 96,
    insteadOf: "Cancún",
    hook: "Everyone flies to the beach. The best craft villages in the Americas are an hour inland.",
  },
  {
    slug: "savannah-historic-squares",
    city: "Savannah", country: "United States", state: "Georgia",
    vibeKey: "historic_residential_districts", subregion: "US Southeast",
    displayScore: 93,
    insteadOf: "Charleston",
    hook: "Twenty-two oak-shaded squares of the original 1733 plan, still laid out exactly as drawn.",
  },
  {
    slug: "san-sebastian-michelin-fine-dining",
    city: "San Sebastian", country: "Spain",
    vibeKey: "michelin_fine_dining", subregion: "Western Europe",
    displayScore: 94,
    insteadOf: "Paris",
    hook: "More Michelin stars per head than anywhere on earth, in a beach town of 190,000.",
  },
  {
    slug: "crete-mediterranean-coastal-cooking",
    city: "Heraklion", country: "Greece", displayName: "Crete",
    vibeKey: "mediterranean_coastal_cooking", subregion: "Mediterranean",
    displayScore: 91,
    insteadOf: "Santorini",
    hook: "Same sea, same light, a quarter of the crowd, and the food people come back for.",
  },
  {
    slug: "quebec-city-french-heritage",
    city: "Quebec City", country: "Canada",
    vibeKey: "old_quebec_french_heritage", subregion: "Eastern Canada",
    displayScore: 97,
    insteadOf: "Montreal",
    hook: "The only walled city north of Mexico, and a shorter flight than most of Europe.",
  },
  {
    slug: "chiang-mai-living-temples",
    city: "Chiang Mai", country: "Thailand",
    vibeKey: "living_temples_spiritual", subregion: "Southeast Asia",
    displayScore: 95,
    insteadOf: "Bangkok",
    hook: "Hundreds of working temples you can sit in, not queue through.",
  },
];

/* A pick below this many ranked vibes is a coverage gap, not a feature.
   The generator refuses rather than shipping a two-row destination. */
const MIN_VIBES = 6;

/* Images per card. Six is what the app's result card cycles. */
const MAX_IMAGES = 6;

async function sb(table, query) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

const enc = (v) => encodeURIComponent(v);

/* An image row is usable if it has a URL. Prefer the ones an editor or
   the AI pass kept, and put the widest/most scenic first — the card's
   first frame is the one most people ever see. */
function pickImages(rows) {
  const all = (rows?.[0]?.images) || [];
  return all
    .filter((i) => i && i.url && i.ai?.keep !== false)
    .slice(0, MAX_IMAGES)
    .map((i) => ({
      url:   i.url,
      thumb: i.thumb || i.url,
      alt:   (i.alt || i.title || "").slice(0, 180),
      credit:     i.photographer || "",
      creditUrl:  i.photographer_url || "",
      source:     i.source || "",
    }));
}

(async () => {
  const out = [];

  for (const pick of PICKS) {
    // ── destination row ───────────────────────────────────────────
    const [dest] = await sb(
      "destinations",
      `select=id,city,country,iata,region,intro_title,intro_body,image_url` +
      `&city=eq.${enc(pick.city)}&country=eq.${enc(pick.country)}&is_active=is.true&limit=1`
    );
    if (!dest) throw new Error(`No destination row for ${pick.city}, ${pick.country}`);

    // ── every ranked vibe this GATEWAY reaches ──────────────────
    // Keyed on iata, exactly as the app keys it (src/lib/vibeRankings.ts).
    // Never dest_id — see the note on PICKS above.
    const byIata = await sb(
      "vibe_destination_rankings",
      `select=vibe_key,vibe_label,destination,score,tier,note,subregion,best_months` +
      `&iata=eq.${enc(dest.iata)}&order=score.desc`
    );
    // One row per vibe, highest score wins: a gateway can carry the same
    // vibe twice under two different place names.
    const seen = new Set();
    const rankings = byIata.filter((r) => {
      if (seen.has(r.vibe_key)) return false;
      seen.add(r.vibe_key);
      return true;
    });
    const hero = rankings.find((r) => r.vibe_key === pick.vibeKey);
    if (!hero) throw new Error(`${pick.city} has no ranking row for ${pick.vibeKey}`);
    if (rankings.length < MIN_VIBES) {
      throw new Error(
        `${pick.city} holds only ${rankings.length} ranked vibes (min ${MIN_VIBES}). ` +
        `Pick a destination the engine has actually covered, or score this one first.`
      );
    }

    // ── the sub-region blog behind that vibe ──────────────────────
    const [blog] = await sb(
      "vibe_blogs",
      `select=title,body,top_destinations,best_window,sources,word_count,last_researched` +
      `&vibe_key=eq.${enc(pick.vibeKey)}&subregion=eq.${enc(pick.subregion)}&limit=1`
    );
    if (!blog) throw new Error(`No blog for ${pick.vibeKey} / ${pick.subregion}`);

    // ── images ────────────────────────────────────────────────────
    const imgRows = await sb(
      "destination_image_edits",
      `select=images&dest_id=eq.${dest.id}&limit=1`
    );
    const images = pickImages(imgRows);
    if (!images.length) throw new Error(`No images on file for ${pick.city}`);

    out.push({
      slug:        pick.slug,
      insteadOf:   pick.insteadOf,
      hook:        pick.hook,
      displayScore: pick.displayScore,

      // What the card calls it. The gateway is Heraklion; the place
      // anyone is actually choosing is Crete.
      city:    pick.displayName || dest.city,
      gateway: dest.city,
      country: dest.country,
      state:   pick.state || null,
      // What the card prints beside the sub-region. A US destination
      // reads "Georgia", never "United States".
      placeLabel: pick.state || dest.country,
      iata:    dest.iata,
      region:  dest.region,
      introTitle: dest.intro_title || null,
      introBody:  dest.intro_body  || null,

      vibeKey:     hero.vibe_key,
      vibeLabel:   hero.vibe_label,
      engineScore: hero.score,
      tier:        hero.tier,
      note:        hero.note || null,
      subregion:   pick.subregion,
      vibeCount:   rankings.length,

      // Everything else this destination ranks for — the Explore page's
      // "every vibe this place matches" list. Hero vibe excluded; it has
      // its own block at the top of that page.
      otherVibes: rankings
        .filter((r) => r.vibe_key !== pick.vibeKey)
        .map((r) => ({
          key: r.vibe_key, label: r.vibe_label, score: r.score, tier: r.tier,
          note: r.note || null,
          // The engine scores a PLACE, which is often not the gateway city:
          // HER carries "The Diktean cave" and "Rethymno". Printing the
          // gateway's own name over those rows would misattribute them.
          // ...but "Crete" over a card already headlined Crete is noise,
          // so the display name counts as the gateway's own name too.
          place: r.destination && r.destination !== dest.city
                 && r.destination !== (pick.displayName || dest.city)
                 ? r.destination : null,
        })),

      blog: {
        title:           blog.title,
        body:            blog.body,
        topDestinations: blog.top_destinations || null,
        bestWindow:      blog.best_window || null,
        sources:         blog.sources || [],
        wordCount:       blog.word_count || null,
        lastResearched:  blog.last_researched || null,
      },

      images,
    });

    console.log(`  ✓ ${pick.displayName || pick.city}, ${pick.state || dest.country} — ${hero.vibe_label} (engine ${hero.score}, ${rankings.length} vibes, ${images.length} images)`);
  }

  const dest = path.join(__dirname, "..", "src", "_data", "featuredVibes.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${out.length} featured vibes → ${path.relative(process.cwd(), dest)}`);
})().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
