// ── Search + AI-crawler plumbing ─────────────────────────────────────────────
// Everything a crawler reads that a visitor never sees: JSON-LD, the social
// preview image, sitemap membership and <lastmod>. Kept in one module so the
// rules live next to each other instead of spread across templates.
//
// The JSON-LD is how search engines and LLMs confirm WHO "WhereTo" is. The
// name collides with the everyday query "where to go", so every page says
// the same thing about the brand: one Organization with one @id, named
// "WhereTo Trips", with "WhereTo" as the alternate.
//
// Deliberately NO Product / Offer schema: the website does not sell or book
// anything (spec §6), and an Offer would advertise that it does.

const { execFileSync } = require("child_process");
const path = require("path");

const ORG_NAME = "WhereTo Trips";

const abs = (site, url) => (!url ? "" : /^https?:\/\//i.test(url) ? url : site.url + (url.startsWith("/") ? "" : "/") + url);

// Social preview image, always 1200x630. Local /media/ paths are made
// absolute first so weserv can fetch them; `bg=white` flattens a transparent
// PNG instead of letting it turn black in the JPEG.
function ogImage(url, site) {
  const full = abs(site, url);
  if (!full) return "";
  const bare = full.replace(/^https?:\/\//i, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(bare)}` +
         `&w=1200&h=630&fit=cover&a=attention&bg=white&q=80&output=jpg`;
}

// "June 25, 2026" / "June 2026" → "2026-06-25" / "2026-06-01". Local
// getters, not toISOString, so a midnight date cannot slide back a day.
function isoDate(str) {
  if (!str) return "";
  const d = new Date(String(str).replace(/^Sept\b/, "Sep"));
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Last commit that touched a file, as YYYY-MM-DD. Needs full history in CI
// (deploy.yml checks out with fetch-depth: 0). An uncommitted or unknown
// file returns "" and the sitemap simply omits <lastmod> for it.
const lastmodCache = new Map();
function gitLastmod(inputPath) {
  if (!inputPath) return "";
  if (lastmodCache.has(inputPath)) return lastmodCache.get(inputPath);
  let out = "";
  try {
    out = execFileSync("git", ["log", "-1", "--format=%cs", "--", path.normalize(inputPath)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (_) { /* not a git checkout: no lastmod */ }
  lastmodCache.set(inputPath, out);
  return out;
}

// Which pages belong in sitemap.xml. Out: anything flagged noindex in front
// matter OR in its own raw <head> (the plain-.html admin tools and the old
// /privacy/ /terms/ redirect stubs carry it there), anything robots.txt
// disallows, and the explicit excludes in crawl.json.
function sitemapItems(all, crawl) {
  const blocked = [...(crawl.disallow || []), ...(crawl.sitemapExclude || [])];
  return all.filter((item) => {
    if (!item.url || !item.url.endsWith("/")) return false;
    if (item.data.noindex || item.data.sitemap === false) return false;
    if (blocked.some((p) => item.url.toLowerCase().startsWith(p.toLowerCase()))) return false;
    if (/<meta\s+name=["']robots["'][^>]*noindex/i.test(item.rawInput || "")) return false;
    return true;
  });
}

// url → title for every page, built once per collection array.
const titleIndex = new WeakMap();
function titlesFor(all) {
  if (!titleIndex.has(all)) {
    const m = new Map();
    for (const item of all) if (item.url) m.set(item.url, item.data.seoCrumb || item.data.title);
    titleIndex.set(all, m);
  }
  return titleIndex.get(all);
}

function breadcrumbs(url, title, all, site) {
  if (!url || url === "/") return null;
  const titles = titlesFor(all);
  const crumbs = [{ name: "Home", url: site.url + "/" }];
  const parts = url.split("/").filter(Boolean);
  for (let i = 1; i < parts.length; i++) {
    const u = "/" + parts.slice(0, i).join("/") + "/";
    const t = titles.get(u);
    if (t) crumbs.push({ name: stripBrand(t), url: site.url + u });
  }
  crumbs.push({ name: stripBrand(title), url: site.url + url });
  return {
    "@type": "BreadcrumbList",
    "@id": site.url + url + "#breadcrumb",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  };
}

// "FAQ — WhereTo travel app" → "FAQ". Breadcrumb names are short labels.
const stripBrand = (t) => String(t || "").split(/\s+[—|]\s+/)[0].trim();

function organization(site) {
  const sameAs = [
    ...(site.social || []).map((s) => s.href),
    site.store && site.store.appleHref,
    site.store && site.store.googleHref,
  ].filter((h) => h && /^https?:\/\//.test(h));
  // The Help Center link, wherever it sits in the nav or footer data.
  const supportHref = (JSON.stringify(site).match(/https:\/\/support\.[a-z.]+/) || [])[0];
  const support = supportHref ? { href: supportHref } : null;
  return {
    "@type": "Organization",
    "@id": site.url + "/#organization",
    name: ORG_NAME,
    alternateName: ["WhereTo", "wheretotrips.com"],
    legalName: "VC Innovations Group LLC",
    url: site.url + "/",
    logo: { "@type": "ImageObject", url: site.url + "/assets/whereto-logo-azure-email.png", width: 440, height: 87 },
    description: site.metaDescription,
    ...(sameAs.length ? { sameAs } : {}),
    ...(support ? { contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: support.href } } : {}),
  };
}

function website(site) {
  return {
    "@type": "WebSite",
    "@id": site.url + "/#website",
    url: site.url + "/",
    name: ORG_NAME,
    alternateName: "WhereTo",
    publisher: { "@id": site.url + "/#organization" },
    inLanguage: "en-US",
  };
}

const plain = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// Builds the page's whole @graph. `p` is assembled in partials/meta.njk.
function jsonLd(p, site, all) {
  const url = site.url + p.url;
  const org = { "@id": site.url + "/#organization" };
  const graph = [organization(site), website(site)];
  const crumb = breadcrumbs(p.url, p.title, all, site);
  const tags = [].concat(p.tags || []);
  const isArticle = tags.includes("insight") || !!p.v;

  const webPage = {
    "@type": p.url === "/faq/" ? "FAQPage" : tags.includes("vibe") || tags.includes("destination") ? "CollectionPage" : "WebPage",
    "@id": url + "#webpage",
    url,
    name: p.title,
    description: p.description,
    isPartOf: { "@id": site.url + "/#website" },
    about: p.url === "/" ? org : undefined,
    inLanguage: "en-US",
    ...(p.image ? { primaryImageOfPage: { "@type": "ImageObject", url: p.image } } : {}),
    ...(crumb ? { breadcrumb: { "@id": crumb["@id"] } } : {}),
    ...(p.lastmod ? { dateModified: p.lastmod } : {}),
  };

  // FAQ answers, straight from the page's own faq_accordion sections so the
  // markup can never disagree with what the visitor reads.
  const faqs = (p.sections || []).filter((s) => s && s.type === "faq_accordion").flatMap((s) => s.items || []);
  if (faqs.length) {
    webPage["@type"] = "FAQPage";
    webPage.mainEntity = faqs.map((f) => ({
      "@type": "Question",
      name: plain(f.q),
      acceptedAnswer: { "@type": "Answer", text: plain(f.a) },
    }));
  }
  graph.push(webPage);
  if (crumb) graph.push(crumb);

  if (isArticle) {
    const published = isoDate(p.published) || p.lastmod;
    const modified = isoDate(p.updated) || p.lastmod || published;
    const article = {
      "@type": "Article",
      "@id": url + "#article",
      headline: stripBrand(p.title).slice(0, 110),
      description: p.description,
      mainEntityOfPage: { "@id": url + "#webpage" },
      author: p.author && !/WhereTo/i.test(p.author) ? { "@type": "Person", name: p.author } : org,
      publisher: org,
      ...(p.image ? { image: p.image } : {}),
      ...(published ? { datePublished: published } : {}),
      ...(modified ? { dateModified: modified } : {}),
      inLanguage: "en-US",
    };
    // A featured-vibe page is about one real place: name it as one, so an
    // engine can tie the page to the destination entity it already knows.
    if (p.v) {
      article.about = {
        "@type": "TouristDestination",
        name: [p.v.city, p.v.placeLabel].filter(Boolean).join(", "),
        touristType: p.v.vibeLabel,
        ...(p.v.country && p.v.country !== p.v.city ? { containedInPlace: { "@type": "Country", name: p.v.country } } : {}),
        ...(p.v.iata ? { identifier: "IATA:" + p.v.iata } : {}),
      };
    }
    graph.push(article);
  }

  // Ranked or curated lists become an ItemList, in page order.
  const list = tags.includes("vibe") ? p.destinations : tags.includes("destination") ? p.picks : null;
  if (list && list.length) {
    graph.push({
      "@type": "ItemList",
      "@id": url + "#list",
      name: p.listHeading || p.title,
      itemListOrder: "https://schema.org/ItemListUnordered",
      numberOfItems: list.length,
      itemListElement: list.map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: { "@type": "TouristDestination", name: d.name, ...(d.blurb ? { description: plain(d.blurb) } : {}) },
      })),
    });
    webPage.mainEntity = { "@id": url + "#list" };
  }

  // The app itself, on /app/. Store links join once they are real URLs.
  if (p.url === "/app/") {
    const dl = [site.store && site.store.appleHref, site.store && site.store.googleHref].filter((h) => h && /^https?:/.test(h));
    graph.push({
      "@type": "MobileApplication",
      "@id": site.url + "/#app",
      name: ORG_NAME,
      alternateName: "WhereTo",
      operatingSystem: "iOS, Android",
      applicationCategory: "TravelApplication",
      description: site.metaDescription,
      publisher: org,
      url,
      ...(dl.length ? { downloadUrl: dl } : {}),
    });
  }

  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, (k, v) => (v === undefined ? undefined : v));
  // A "</script>" inside any string would close the tag early.
  return json.replace(/</g, "\\u003c");
}

module.exports = { ogImage, isoDate, gitLastmod, sitemapItems, jsonLd, stripBrand };
