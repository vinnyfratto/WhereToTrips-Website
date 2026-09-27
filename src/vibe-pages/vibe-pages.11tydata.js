// Shared data for the generated Vibe Engine pages (hub, guide, destination).
// Everything comes from src/_data/vibePages.json, written by
// scripts/gen-vibe-pages.js. Each template paginates one list with an alias
// (`hub`, `guide` or `dest`); the computed fields below turn whichever one
// the page has into its title, description and structured data.

const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

// Meta description: the answer-first paragraph, cut at a word near 158 chars.
const clip = (s, n = 158) => {
  s = String(s || "");
  if (s.length <= n) return s;
  return s.slice(0, s.lastIndexOf(" ", n - 1)).replace(/[;,:]$/, "") + "…";
};

const rec = (d) => d.hub || d.guide || d.dest;

module.exports = {
  layout: "layouts/base.njk",
  // The pages are built from this data file, so it is what dates them in sitemap.xml.
  lastmodSource: "src/_data/vibePages.json",
  ldPreview: true,
  eleventyComputed: {
    // While previewing, nothing here is indexed or listed in the sitemap.
    noindex: (d) => !!(d.vibePages && d.vibePages.preview),

    title: (d) =>
      d.hub ? `Best Places to ${d.hub.label}` :
      d.guide ? d.guide.title :
      d.dest ? d.dest.name : d.title,

    seoTitle: (d) =>
      d.hub ? `Best Places to ${d.hub.label}` :
      d.guide ? `${d.guide.title}: ${d.guide.places.length} Spots Ranked` :
      d.dest ? `${d.dest.name}: What It's Best For and When to Go` : undefined,

    description: (d) => (rec(d) ? clip(rec(d).answer) : d.description),
    updatedText: (d) => (rec(d) ? fmtDate(rec(d).updated) : ""),
    researchedText: (d) => (d.guide ? fmtDate(d.guide.lastResearched) : ""),

    ogImage: (d) =>
      d.hub ? d.hub.image :
      d.guide ? d.guide.image :
      d.dest && d.dest.images[0] ? d.dest.images[0].url : undefined,

    pageType: (d) => (d.hub ? "CollectionPage" : d.dest ? "WebPage" : undefined),
    pageFaq: (d) => (rec(d) ? rec(d).faq : undefined),

    pageListName: (d) =>
      d.hub ? `Best places to ${d.hub.phrase}` :
      d.guide ? `${d.guide.vibeLabel} in ${d.guide.where}, ranked` : undefined,
    pageList: (d) => {
      const r = d.hub || d.guide;
      if (!r) return undefined;
      return r.places.map((p) => ({ name: p.name, description: p.note, url: p.gateway && p.gateway.url }));
    },

    pageArticle: (d) =>
      d.guide ? {
        published: d.guide.lastResearched,
        modified: d.guide.updated,
        citations: (d.guide.sources || []).filter((s) => s.url).map((s) => ({ name: s.title || s.url, url: s.url })),
      } : undefined,

    pagePlace: (d) =>
      d.dest ? {
        name: d.dest.name,
        description: d.dest.introBody || d.dest.answer,
        country: d.dest.country !== d.dest.city ? d.dest.country : null,
        touristType: d.dest.vibes.slice(0, 6).map((v) => v.label),
        iata: d.dest.iata,
      } : undefined,
  },
};
