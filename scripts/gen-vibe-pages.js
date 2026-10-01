#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   gen-vibe-pages.js

   Writes src/_data/vibePages.json: the Vibe Engine published as web
   pages, so search engines and AI assistants can read (and quote) what
   the app knows. Three page types, all linked to each other:

     /vibes/<canonical>/                 hub: best places in the world for
                                         one of the 147 vibes a traveler picks
     /vibes/<canonical>/<sub-region>/    guide: the researched sub-region blog
                                         plus its ranked table
     /destinations/<city>-<country>/     destination: its intro and every
                                         vibe it scores for

   Everything printed is Vibe Engine data. The "answer first" paragraph
   and the FAQ on each page are sentences assembled from the ranking rows,
   never free-written, so they cannot say anything the data doesn't.

   What stays private: the six sub-scores (sig/qual/brd/acc/rel/val), the
   weights and the confidence values. Only the final score, tier, note and
   best months are published, which is what the app already shows.

   Same committed-snapshot rule as gen-featured-vibes.js: run by hand,
   commit the JSON. A deploy never depends on Supabase being up.

       node scripts/gen-vibe-pages.js

   PREVIEW: while `PREVIEW` is true every generated page is noindex and
   left out of sitemap.xml, so pages can be reviewed live before search
   engines see them.
   ════════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const { url: SB_URL, anonKey: SB_KEY } = require("../src/_data/supabase.json");

const PREVIEW = true;

/* ── What to build ─────────────────────────────────────────────────────
   Three samples for review. Scaling up is a matter of widening these. */
const HUBS = ["snorkeling"];
const DESTINATIONS = ["LIS"];
const GUIDES = [{ subregion: "Caribbean", vibeKey: "reef_snorkeling" }];

/* A hub's label is an action phrase in title case ("Snorkel Reefs &
   Marine Life"). Prose needs it in sentence case, and a lowercasing rule
   can't know that "Italian" stays capitalized, so each hub's in-sentence
   phrase is written once here. Missing → the label with its first letter
   lowered, which is right for most. */
const PHRASE = {
  snorkeling: "snorkel reefs and marine life",
};

const TOP_PLACES = 15;
const MAX_IMAGES = 6;

// ── helpers ──────────────────────────────────────────────────────────────
async function sb(table, query) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}
const enc = encodeURIComponent;
const inList = (arr) => `in.(${arr.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(",")})`;

const slugify = (s) =>
  String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const hubSlug = (canonicalKey) => slugify(canonicalKey.replace(/_/g, "-"));
const destSlug = (d) => (d.city === d.country ? slugify(d.city) : slugify(`${d.city}-${d.country}`));

// "the Caribbean", "the US Southeast", but "Mexico", "Southeast Asia".
const THE = /^(Caribbean|Mediterranean|Middle East|Pacific Islands|Balkans|Baltics|British Isles|Low Countries|Nordics|Alps|US )/;
const theRegion = (sr) => (THE.test(sr) ? `the ${sr}` : sr);

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const MON = MONTHS.map((m) => m.slice(0, 3));

// "4-8", "12-7" (wraps), "1,2,3", or an int array → [4,5,6,7,8]
function parseMonths(v) {
  if (Array.isArray(v)) return [...new Set(v.map(Number).filter((n) => n >= 1 && n <= 12))];
  const s = String(v || "").trim();
  if (!s) return [];
  const range = s.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
  if (range) {
    const [a, b] = [Number(range[1]), Number(range[2])];
    const out = [];
    for (let m = a, i = 0; i < 12; m = (m % 12) + 1, i++) { out.push(m); if (m === b) break; }
    return out;
  }
  return [...new Set(s.split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= 12))];
}

// [4,5,6,9,10] → "April to June and September to October"; 12 months → "all year"
function monthsText(ms, short = false) {
  const names = short ? MON : MONTHS;
  const set = new Set(ms);
  if (set.size === 0) return "";
  if (set.size === 12) return short ? "All year" : "all year";
  // Start a run at a month whose predecessor isn't in the set (handles Dec→Jan).
  const runs = [];
  for (let m = 1; m <= 12; m++) {
    if (!set.has(m) || set.has(m === 1 ? 12 : m - 1)) continue;
    let end = m;
    while (set.has((end % 12) + 1) && (end % 12) + 1 !== m) end = (end % 12) + 1;
    runs.push(end === m ? names[m] : `${names[m]} to ${names[end]}`);
  }
  return runs.length > 1 ? runs.slice(0, -1).join(", ") + " and " + runs[runs.length - 1] : runs[0];
}

const placeName = (r) =>
  r.admin_area && r.admin_area !== r.destination && r.admin_area !== "United States"
    ? `${r.destination}, ${r.admin_area}` : r.destination;

// "A, B and C"
const andList = (xs) => (xs.length > 1 ? xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1] : xs[0] || "");

// Mid-sentence form of a ranking row's name: "The Bazaruto reefs" → "the Bazaruto reefs".
const nm = (name) => String(name).replace(/^The /, "the ");
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// "A (1); B (2); and C (3)": semicolons, because row names carry their own commas.
const semiList = (xs) => (xs.length > 2 ? xs.slice(0, -1).join("; ") + "; and " + xs[xs.length - 1] : xs.join(" and "));

const trimNote = (n) => (n ? String(n).trim().replace(/[.\s]+$/, "") : "");
const latest = (dates) => dates.filter(Boolean).map((d) => String(d).slice(0, 10)).sort().pop() || null;

function pickImages(rows) {
  return ((rows?.[0]?.images) || [])
    .filter((i) => i && i.url && i.ai?.keep !== false)
    .slice(0, MAX_IMAGES)
    .map((i) => ({
      url: i.url,
      alt: (i.alt || i.title || "").slice(0, 180),
      credit: i.photographer || "",
      creditUrl: i.photographer_url || "",
      source: i.source || "",
    }));
}

const SCORING_ANSWER =
  "Every place is scored on six questions, asked the same way every time: how distinctive the experience is there " +
  "(weighted heaviest), how good it is, how much of it there is, how hard it is to reach, how reliable it is across " +
  "seasons, and what it costs (weighted least). A place is only ranked when it delivers a real version of the experience.";

// ── main ─────────────────────────────────────────────────────────────────
(async () => {
  const vibeKeys = await sb("vibe_keys", "select=key,label,canonical_key");
  const canon = await sb("vibe_canonical_map", "select=canonical_key,canonical_label,shelf_code,category_code");
  const shelves = await sb("vibe_shelves", "select=code,display_name,blurb,image_1");
  const cats = await sb("vibe_categories", "select=code,display_name");
  const canonByKey = new Map(canon.map((c) => [c.canonical_key, c]));
  const canonOfEngine = new Map(vibeKeys.map((k) => [k.key, k.canonical_key]));
  const shelfByCode = new Map(shelves.map((s) => [s.code, s]));
  const catByCode = new Map(cats.map((c) => [c.code, c]));

  // Which pages exist in THIS build, so a link is only printed where a page is.
  const hubSet = new Set(HUBS);
  const destSet = new Set(DESTINATIONS);
  const guideSet = new Set(GUIDES.map((g) => `${g.subregion}|${g.vibeKey}`));
  const guideUrl = (subregion, vibeKey) => {
    const hub = canonOfEngine.get(vibeKey);
    return hub && guideSet.has(`${subregion}|${vibeKey}`) ? `/vibes/${hubSlug(hub)}/${slugify(subregion)}/` : null;
  };
  const hubUrl = (canonicalKey) => (canonicalKey && hubSet.has(canonicalKey) ? `/vibes/${hubSlug(canonicalKey)}/` : null);

  // Gateway destinations by IATA (rankings match on IATA, never dest_id).
  const destCache = new Map();
  async function destsByIata(iatas) {
    const need = [...new Set(iatas.filter((i) => i && !destCache.has(i)))];
    for (let i = 0; i < need.length; i += 150) {
      const rows = await sb("destinations",
        `select=id,city,country,iata,region,intro_title,intro_body,best_months,image_url,updated_at` +
        `&is_active=is.true&iata=${inList(need.slice(i, i + 150))}`);
      for (const r of rows) destCache.set(r.iata, r);
    }
    for (const i of need) if (!destCache.has(i)) destCache.set(i, null);
    return destCache;
  }
  const destUrl = (iata) => {
    const d = destCache.get(iata);
    return d && destSet.has(iata) ? `/destinations/${destSlug(d)}/` : null;
  };

  // ── hubs ────────────────────────────────────────────────────────────────
  const hubs = [];
  for (const key of HUBS) {
    const c = canonByKey.get(key);
    if (!c) throw new Error(`No canonical vibe "${key}"`);
    const engineKeys = vibeKeys.filter((k) => k.canonical_key === key).map((k) => k.key);
    const rows = await sb("vibe_destination_rankings",
      `select=vibe_key,vibe_label,destination,admin_area,subregion,iata,score,tier,best_months,note,updated_at` +
      `&vibe_key=${inList(engineKeys)}&order=score.desc`);
    const blogs = await sb("vibe_blogs", `select=subregion,vibe_key,title&vibe_key=${inList(engineKeys)}`);
    await destsByIata(rows.map((r) => r.iata));

    // One row per place, highest score wins (a place can rank under two engine keys).
    const seen = new Set();
    const places = rows
      .sort((a, b) => b.score - a.score || placeName(a).localeCompare(placeName(b)))
      .filter((r) => { const k = placeName(r).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });

    const regions = blogs.map((b) => {
      const rr = rows.filter((r) => r.subregion === b.subregion && r.vibe_key === b.vibe_key);
      return {
        subregion: b.subregion, title: b.title, count: rr.length,
        top: rr.length ? Math.max(...rr.map((r) => r.score)) : 0,
        leader: rr.length ? placeName(rr.sort((a, z) => z.score - a.score)[0]) : null,
        url: guideUrl(b.subregion, b.vibe_key),
      };
    }).sort((a, b) => b.top - a.top || b.count - a.count);

    const phrase = PHRASE[key] || c.canonical_label.charAt(0).toLowerCase() + c.canonical_label.slice(1);
    const shelf = shelfByCode.get(c.shelf_code) || {};
    const top = places.slice(0, TOP_PLACES).map((r) => ({
      name: placeName(r), subregion: r.subregion, score: r.score, tier: r.tier, note: trimNote(r.note),
      months: monthsText(parseMonths(r.best_months), true),
      monthsLong: monthsText(parseMonths(r.best_months)),
      gateway: destCache.get(r.iata) ? { city: destCache.get(r.iata).city, iata: r.iata, url: destUrl(r.iata) } : null,
      guideUrl: guideUrl(r.subregion, r.vibe_key),
    }));
    const [p1, p2, p3] = top;
    const answer =
      `The top-scoring places to ${phrase} in the WhereTo Vibe Engine are ` +
      semiList([p1, p2, p3].map((p) => `${nm(p.name)} (${p.score})`)) + `. ` +
      `The engine ranks ${places.length} places for it across ${regions.length} regions, led by ` +
      andList(regions.slice(0, 3).map((r) => theRegion(r.subregion))) + ".";

    hubs.push({
      slug: hubSlug(key), key, label: c.canonical_label, phrase,
      shelf: { name: shelf.display_name || "", blurb: shelf.blurb || "" },
      category: (catByCode.get(c.category_code) || {}).display_name || "",
      image: shelf.image_1 || null,
      answer,
      placeCount: places.length,
      places: top,
      regions,
      updated: latest(rows.map((r) => r.updated_at)),
      faq: [
        { q: `Where is the best place to ${phrase}?`,
          a: `${cap(p1.name)}, in ${theRegion(p1.subregion)}, scores highest in the WhereTo Vibe Engine at ${p1.score}` +
             `${p1.note ? `: ${p1.note}` : ""}. Next are ` + semiList([p2, p3].map((p) => `${nm(p.name)} (${p.score})`)) + "." },
        { q: `When is the best time to ${phrase}?`,
          a: `It depends on where you go. ` + top.slice(0, 4).map((p) => `${cap(p.name)}: ${p.monthsLong || "varies"}`).join(". ") + "." },
        { q: `Which regions are best to ${phrase}?`,
          a: `By top score: ` + regions.slice(0, 4).map((r) => `${theRegion(r.subregion)}, led by ${nm(r.leader)} (${r.top})`).join("; ") +
             `. ${regions.length} regions have at least one ranked place.` },
        { q: "How does WhereTo score these places?", a: SCORING_ANSWER },
      ],
    });
    console.log(`  ✓ hub /vibes/${hubSlug(key)}/  ${places.length} places, ${regions.length} regions`);
  }

  // ── guides ──────────────────────────────────────────────────────────────
  const guides = [];
  for (const g of GUIDES) {
    const [blog] = await sb("vibe_blogs",
      `select=subregion,vibe_key,vibe_label,title,body,best_window,sources,word_count,last_researched,updated_at` +
      `&subregion=eq.${enc(g.subregion)}&vibe_key=eq.${enc(g.vibeKey)}&limit=1`);
    if (!blog) throw new Error(`No blog for ${g.vibeKey} / ${g.subregion}`);
    const rows = await sb("vibe_destination_rankings",
      `select=destination,admin_area,iata,score,tier,best_months,note,updated_at` +
      `&subregion=eq.${enc(g.subregion)}&vibe_key=eq.${enc(g.vibeKey)}&order=score.desc`);
    await destsByIata(rows.map((r) => r.iata));
    const hubKey = canonOfEngine.get(g.vibeKey);
    const hub = canonByKey.get(hubKey);
    const places = rows.map((r) => ({
      name: placeName(r), score: r.score, tier: r.tier, note: trimNote(r.note),
      months: monthsText(parseMonths(r.best_months), true),
      monthsLong: monthsText(parseMonths(r.best_months)),
      gateway: destCache.get(r.iata) ? { city: destCache.get(r.iata).city, iata: r.iata, url: destUrl(r.iata) } : null,
    }));
    const [p1, p2, p3] = places;
    const where = theRegion(g.subregion);
    const window = monthsText(parseMonths(blog.best_window));
    guides.push({
      slug: `${hubSlug(hubKey)}/${slugify(g.subregion)}`,
      subregion: g.subregion, where, vibeKey: g.vibeKey, vibeLabel: blog.vibe_label,
      hub: hub ? { label: hub.canonical_label, url: hubUrl(hubKey) } : null,
      title: blog.title,
      body: blog.body,
      sources: blog.sources || [],
      wordCount: blog.word_count,
      lastResearched: blog.last_researched,
      bestWindow: window,
      image: (shelfByCode.get(hub && hub.shelf_code) || {}).image_1 || null,
      places,
      updated: latest([blog.updated_at, blog.last_researched, ...rows.map((r) => r.updated_at)]),
      answer:
        `The top-scoring places for ${blog.vibe_label} in ${where} are ` +
        semiList([p1, p2, p3].map((p) => `${nm(p.name)} (${p.score})`)) + "." +
        (window ? ` The best window is ${window}.` : ""),
      faq: [
        { q: `Where is the best place for ${blog.vibe_label} in ${where}?`,
          a: `${cap(p1.name)} scores highest at ${p1.score}${p1.note ? `: ${p1.note}` : ""}. Next are ` +
             semiList(places.slice(1, 4).map((p) => `${nm(p.name)} (${p.score})`)) + "." },
        ...(window ? [{ q: `When is the best time for ${blog.vibe_label} in ${where}?`,
          a: `${cap(window)} across the region. By place: ` +
             places.slice(0, 4).map((p) => `${cap(p.name)}, ${p.monthsLong}`).join(". ") + "." }] : []),
        { q: `How many places in ${where} does WhereTo rank for this?`,
          a: `${places.length}, scored from ${places[places.length - 1].score} to ${p1.score}. The table on this page lists all of them.` },
      ],
    });
    console.log(`  ✓ guide /vibes/${hubSlug(hubKey)}/${slugify(g.subregion)}/  ${places.length} places, ${(blog.sources || []).length} sources`);
  }

  // ── destinations ────────────────────────────────────────────────────────
  const destinations = [];
  await destsByIata(DESTINATIONS);
  for (const iata of DESTINATIONS) {
    const d = destCache.get(iata);
    if (!d) throw new Error(`No active destination for ${iata}`);
    const rows = await sb("vibe_destination_rankings",
      `select=vibe_key,vibe_label,destination,subregion,score,tier,best_months,note,updated_at` +
      `&iata=eq.${enc(iata)}&order=score.desc`);
    const blogs = await sb("vibe_blogs",
      `select=subregion,vibe_key&vibe_key=${inList([...new Set(rows.map((r) => r.vibe_key))])}`);
    const hasBlog = new Set(blogs.map((b) => `${b.subregion}|${b.vibe_key}`));
    const seen = new Set();
    const vibes = rows.filter((r) => (seen.has(r.vibe_key) ? false : seen.add(r.vibe_key))).map((r) => {
      const ck = canonOfEngine.get(r.vibe_key);
      return {
        label: r.vibe_label, score: r.score, tier: r.tier, note: trimNote(r.note),
        place: r.destination && r.destination !== d.city ? r.destination : null,
        months: monthsText(parseMonths(r.best_months), true),
      monthsLong: monthsText(parseMonths(r.best_months)),
        hub: ck && canonByKey.get(ck) ? { label: canonByKey.get(ck).canonical_label, url: hubUrl(ck) } : null,
        guideUrl: hasBlog.has(`${r.subregion}|${r.vibe_key}`) ? guideUrl(r.subregion, r.vibe_key) : null,
      };
    });
    const subregion = Object.entries(rows.reduce((m, r) => ((m[r.subregion] = (m[r.subregion] || 0) + 1), m), {}))
      .sort((a, b) => b[1] - a[1])[0]?.[0] || d.region;
    const imgRows = await sb("destination_image_edits", `select=images&dest_id=eq.${d.id}&limit=1`);
    const images = pickImages(imgRows);
    if (!images.length && d.image_url) images.push({ url: d.image_url, alt: `${d.city}, ${d.country}` });
    const best = monthsText(parseMonths(d.best_months));
    const [v1, v2, v3] = vibes;
    const nearby = vibes.filter((v) => v.place).slice(0, 4);
    const name = d.city === d.country ? d.city : `${d.city}, ${d.country}`;

    destinations.push({
      slug: destSlug(d), city: d.city, country: d.country, name, iata, subregion,
      introTitle: d.intro_title, introBody: d.intro_body,
      bestMonths: best, bestMonthsShort: monthsText(parseMonths(d.best_months), true), images, vibes,
      updated: latest([d.updated_at, ...rows.map((r) => r.updated_at)]),
      answer:
        `In the WhereTo Vibe Engine, ${d.city} scores highest for ${v1.label} (${v1.score}), ${v2.label} (${v2.score}) ` +
        `and ${v3.label} (${v3.score}), out of ${vibes.length} travel vibes it matches.` +
        (best ? ` The best months to go are ${best}.` : ""),
      faq: [
        { q: `What is ${d.city} best known for?`,
          a: `Its top-scoring vibes are ` + andList(vibes.slice(0, 4).map((v) => `${v.label} (${v.score})`)) +
             `.${v1.note ? ` For ${v1.label}: ${v1.note}.` : ""}` },
        ...(best ? [{ q: `When is the best time to visit ${d.city}?`, a: `${best.charAt(0).toUpperCase() + best.slice(1)}.` }] : []),
        ...(nearby.length ? [{ q: `What can you reach from ${d.city}?`,
          a: `The engine also scores places you reach from ${d.city}'s airport (${iata}), including ` +
             andList(nearby.map((v) => `${v.place} (${v.label})`)) + "." }] : []),
        { q: `How many travel vibes does ${d.city} match?`,
          a: `${vibes.length}, scored from ${vibes[vibes.length - 1].score} to ${v1.score}. ${SCORING_ANSWER}` },
      ],
    });
    console.log(`  ✓ destination /destinations/${destSlug(d)}/  ${vibes.length} vibes, ${images.length} images`);
  }

  const out = { preview: PREVIEW, generated: new Date().toISOString().slice(0, 10), hubs, guides, destinations };
  const file = path.join(__dirname, "..", "src", "_data", "vibePages.json");
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${hubs.length} hub(s), ${guides.length} guide(s), ${destinations.length} destination(s) → ${path.relative(process.cwd(), file)}`);
})().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
