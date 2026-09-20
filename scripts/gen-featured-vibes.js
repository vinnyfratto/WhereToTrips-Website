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

/* ── The picks ──────────────────────────────────────────────────────
   Six top-tier vibes deliberately matched to the destination people
   DON'T think of first. `insteadOf` is the hook line on the card. */
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
    slug: "san-sebastian-michelin-fine-dining",
    city: "San Sebastian", country: "Spain",
    vibeKey: "michelin_fine_dining", subregion: "Western Europe",
    displayScore: 94,
    insteadOf: "Paris",
    hook: "More Michelin stars per head than anywhere on earth, in a beach town of 190,000.",
  },
  {
    slug: "crete-mediterranean-coastal-cooking",
    city: "Heraklion", country: "Greece",
    vibeKey: "mediterranean_coastal_cooking", subregion: "Mediterranean",
    displayScore: 91,
    insteadOf: "Santorini",
    hook: "Same sea, same light, a quarter of the crowd, and the food people actually come back for.",
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
    slug: "kanazawa-cherry-blossoms",
    city: "Kanazawa", country: "Japan",
    vibeKey: "cherry_blossoms", subregion: "East Asia",
    displayScore: 92,
    insteadOf: "Kyoto",
    hook: "One of Japan's three great gardens, 400 cherry trees, and free entry at peak bloom.",
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

    // ── every ranked vibe this destination holds ──────────────────
    const rankings = await sb(
      "vibe_destination_rankings",
      `select=vibe_key,vibe_label,score,tier,note,subregion,best_months&dest_id=eq.${dest.id}&order=score.desc`
    );
    const hero = rankings.find((r) => r.vibe_key === pick.vibeKey);
    if (!hero) throw new Error(`${pick.city} has no ranking row for ${pick.vibeKey}`);

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

      city:    dest.city,
      country: dest.country,
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

      // Everything else this destination ranks for — the Explore page's
      // "every vibe this place matches" list. Hero vibe excluded; it has
      // its own block at the top of that page.
      otherVibes: rankings
        .filter((r) => r.vibe_key !== pick.vibeKey)
        .map((r) => ({ key: r.vibe_key, label: r.vibe_label, score: r.score, tier: r.tier, note: r.note || null })),

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

    console.log(`  ✓ ${pick.city} — ${hero.vibe_label} (engine ${hero.score}, ${images.length} images)`);
  }

  const dest = path.join(__dirname, "..", "src", "_data", "featuredVibes.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${out.length} featured vibes → ${path.relative(process.cwd(), dest)}`);
})().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
