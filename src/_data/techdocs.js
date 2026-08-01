// Build-time loader for the TechDocs page.
// Pulls the engineering docs out of the (public) whereto-docs repo and returns them
// grouped by section with a parsed date, ready for the /techdocs page to render and
// filter. Discovery is one GitHub tree API call; file contents come from the raw CDN
// (not rate limited). Set GITHUB_TOKEN in CI to raise the API limit.
//
// Env overrides:
//   TECHDOCS_REPO    default "vinnyfratto/whereto-docs"
//   TECHDOCS_BRANCH  default "main"
//   TECHDOCS_LOCAL   absolute path to a local Wander_App checkout; if set, reads the
//                    working tree from disk instead of GitHub (used for local preview).
//   GITHUB_TOKEN     optional, raises the GitHub API rate limit.

const fs = require("fs");
const path = require("path");

const REPO = process.env.TECHDOCS_REPO || "vinnyfratto/whereto-docs";
const BRANCH = process.env.TECHDOCS_BRANCH || "main";
const LOCAL = process.env.TECHDOCS_LOCAL || "";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

// Which files count as docs. Underscore-prefixed files (e.g. ADR _template.md) are skipped.
const INCLUDE = [/^docs\/.+\.md$/i, /^week-in-review\/.+\.md$/i, /^CHANGELOG\.md$/i];
const included = (p) => INCLUDE.some((rx) => rx.test(p)) && !p.split("/").pop().startsWith("_");

// Path -> section. Order controls display order on the page.
const SECTIONS = [
  { key: "overview", title: "Overview", order: 0, match: (p) => p === "docs/README.md" },
  { key: "state", title: "Current State", order: 1, match: (p) => p === "docs/STATE.md" },
  { key: "stack", title: "Tech Stack", order: 2, match: (p) => p === "docs/tech-stack.md" },
  { key: "architecture", title: "Architecture", order: 3, match: (p) => p.startsWith("docs/architecture/") },
  { key: "vibes-engine", title: "Vibe Engine", order: 3.5, match: (p) => p.startsWith("docs/vibes-engine/") },
  { key: "decisions", title: "Decisions (ADRs)", order: 4, match: (p) => p.startsWith("docs/decisions/") },
  { key: "liteapi", title: "LiteAPI Integration", order: 4.5, match: (p) => p.startsWith("docs/liteapi/") },
  { key: "process", title: "Process", order: 5, match: (p) => p.startsWith("docs/process/") },
  { key: "operations", title: "Operations", order: 6, match: (p) => p.startsWith("docs/operations/") },
  { key: "security", title: "Security & Data", order: 7, match: (p) => p === "docs/security-and-data.md" },
  { key: "risks", title: "Risks & Tech Debt", order: 8, match: (p) => p === "docs/risks.md" },
  { key: "gap", title: "Gap Report", order: 9, match: (p) => p === "docs/GAP-REPORT.md" },
  { key: "automation", title: "Automation", order: 10, match: (p) => p.startsWith("docs/automation/") },
  { key: "templates", title: "Templates", order: 11, match: (p) => p.startsWith("docs/templates/") },
  { key: "changelog", title: "Changelog", order: 12, match: (p) => p === "CHANGELOG.md" },
  { key: "weekly", title: "Week in Review", order: 13, match: (p) => p.startsWith("week-in-review/") },
];
const sectionFor = (p) => SECTIONS.find((s) => s.match(p)) || { key: "other", title: "Feature References", order: 90 };

function ghHeaders() {
  const h = { "User-Agent": "wt-techdocs", Accept: "application/vnd.github+json" };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

async function listRemote() {
  const url = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`tree ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (json.truncated) console.warn("[techdocs] tree was truncated by GitHub; some docs may be missing");
  return (json.tree || []).filter((n) => n.type === "blob").map((n) => n.path).filter(included);
}
async function readRemote(p) {
  const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${encodeURI(p)}`, {
    headers: { "User-Agent": "wt-techdocs" },
  });
  if (!res.ok) throw new Error(`raw ${res.status} ${p}`);
  return res.text();
}

function listLocal(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const fp = path.join(dir, name);
      if (fs.statSync(fp).isDirectory()) walk(fp);
      else out.push(path.relative(root, fp).split(path.sep).join("/"));
    }
  };
  for (const sub of ["docs", "week-in-review"]) {
    const base = path.join(root, sub);
    if (fs.existsSync(base)) walk(base);
  }
  if (fs.existsSync(path.join(root, "CHANGELOG.md"))) out.push("CHANGELOG.md");
  return out.filter(included);
}

function titleOf(md, p) {
  const m = md.match(/^#\s+(.+?)\s*$/m);
  if (m) return m[1].replace(/[#*`]/g, "").trim();
  return p.split("/").pop().replace(/\.md$/i, "");
}
function isoWeekMonday(y, w) {
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Dow = (jan4.getUTCDay() + 6) % 7; // 0 = Monday
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - jan4Dow);
  const d = new Date(week1Mon);
  d.setUTCDate(week1Mon.getUTCDate() + (w - 1) * 7);
  return d.toISOString().slice(0, 10);
}
function dateOf(md, p) {
  const wk = p.match(/(\d{4})-W(\d{2})/i);
  if (wk) return isoWeekMonday(+wk[1], +wk[2]);
  const pats = [
    /\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/i,
    /Last updated:\s*_?(\d{4}-\d{2}-\d{2})/i,
    /Prepared:?\s*(\d{4}-\d{2}-\d{2})/i,
  ];
  for (const rx of pats) {
    const m = md.match(rx);
    if (m) return m[1];
  }
  const any = md.match(/(\d{4}-\d{2}-\d{2})/);
  return any ? any[1] : "";
}
function adrNum(p) {
  const m = p.split("/").pop().match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}
function sortDocs(section) {
  if (section.key === "decisions") section.docs.sort((a, b) => adrNum(a.path) - adrNum(b.path));
  else if (section.key === "weekly") section.docs.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  else if (section.key === "liteapi") {
    // Deliberate reading order: index first, then platform, per-product, commercials.
    const ORDER = ["README", "PLATFORM", "FLIGHTS", "HOTELS", "PAYMENTS", "COMMERCIALS"];
    const rank = (p) => {
      const f = p.split("/").pop().replace(/\.md$/i, "");
      const i = ORDER.indexOf(f);
      return i === -1 ? 99 : i;
    };
    section.docs.sort((a, b) => rank(a.path) - rank(b.path));
  }
  else section.docs.sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title));
}

module.exports = async function () {
  const meta = {
    ok: false,
    error: "",
    source: LOCAL ? "local" : "remote",
    repo: LOCAL || REPO,
    branch: LOCAL ? "(working tree)" : BRANCH,
    generatedAt: new Date().toISOString(),
    count: 0,
    sections: [],
  };
  try {
    let paths, reader;
    if (LOCAL) {
      paths = listLocal(LOCAL);
      reader = (p) => fs.promises.readFile(path.join(LOCAL, p), "utf8");
    } else {
      paths = await listRemote();
      reader = readRemote;
    }
    const docs = [];
    for (const p of paths) {
      let md;
      try {
        md = await reader(p);
      } catch (e) {
        console.warn(`[techdocs] skip ${p}: ${e.message}`);
        continue;
      }
      const sec = sectionFor(p);
      docs.push({ path: p, title: titleOf(md, p), date: dateOf(md, p), markdown: md, sectionKey: sec.key });
    }
    const byKey = new Map();
    for (const s of [...SECTIONS, { key: "other", title: "Feature References", order: 90 }]) {
      byKey.set(s.key, { key: s.key, title: s.title, order: s.order, docs: [] });
    }
    for (const d of docs) (byKey.get(d.sectionKey) || byKey.get("other")).docs.push(d);
    const sections = [...byKey.values()].filter((s) => s.docs.length).sort((a, b) => a.order - b.order);
    sections.forEach(sortDocs);
    meta.ok = true;
    meta.count = docs.length;
    meta.sections = sections;
    console.log(`[techdocs] loaded ${docs.length} docs from ${meta.source} (${meta.repo}@${meta.branch})`);
  } catch (e) {
    meta.error = e.message;
    console.warn(`[techdocs] load failed: ${e.message}`);
  }
  return meta;
};
