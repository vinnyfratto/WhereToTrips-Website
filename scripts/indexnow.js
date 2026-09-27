#!/usr/bin/env node
// IndexNow: tell Bing (and Yandex, Naver, Seznam, which share submissions)
// which pages changed, so they re-crawl in minutes instead of weeks. Bing's
// index is what ChatGPT search reads, so this is the fastest path from a
// deploy to an AI answer.
//
// Two steps, run by .github/workflows/deploy.yml:
//
//   node scripts/indexnow.js diff _site/sitemap.xml indexnow-urls.json
//     BEFORE deploy. Compares the freshly built sitemap against the one still
//     live and writes the URLs that are new or whose <lastmod> moved. The
//     nightly TechDocs rebuild changes nothing public, so it submits nothing.
//
//   node scripts/indexnow.js submit indexnow-urls.json
//     AFTER deploy, once the key file and the new pages are live.
//
// Never fails the workflow: a missed ping only means waiting for a normal
// crawl, and must not block a deploy.

const fs = require("fs");
const path = require("path");

const crawl = require(path.join(__dirname, "..", "src", "_data", "crawl.json"));
const site = require(path.join(__dirname, "..", "src", "_data", "site.json"));
const HOST = new URL(site.url).host;

function parse(xml) {
  const out = new Map();
  for (const m of String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1];
    const lastmod = (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || "";
    if (loc) out.set(loc.trim(), lastmod.trim());
  }
  return out;
}

async function diff(builtPath, outPath) {
  const built = parse(fs.readFileSync(builtPath, "utf8"));
  let live = new Map();
  try {
    const res = await fetch(`${site.url}/sitemap.xml`, { cache: "no-store" });
    if (res.ok) live = parse(await res.text());
  } catch (e) {
    console.warn(`[indexnow] could not read the live sitemap (${e.message}); submitting everything`);
  }
  const changed = [...built].filter(([loc, lm]) => !live.has(loc) || live.get(loc) !== lm).map(([loc]) => loc);
  fs.writeFileSync(outPath, JSON.stringify(changed, null, 2));
  console.log(`[indexnow] ${changed.length} of ${built.size} URL(s) new or changed`);
  for (const u of changed) console.log("  " + u);
}

async function submit(listPath) {
  let urls = [];
  try { urls = JSON.parse(fs.readFileSync(listPath, "utf8")); } catch (_) {}
  if (!urls.length) return console.log("[indexnow] nothing changed; no submission");
  const body = {
    host: HOST,
    key: crawl.indexNowKey,
    keyLocation: `${site.url}/${crawl.indexNowKey}.txt`,
    urlList: urls.slice(0, 10000),
  };
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    // 200 = accepted, 202 = accepted while the key is still being verified.
    console.log(`[indexnow] submitted ${urls.length} URL(s): HTTP ${res.status} ${await res.text()}`);
  } catch (e) {
    console.warn(`[indexnow] submission failed (${e.message}); pages will be picked up on the next crawl`);
  }
}

const [cmd, a, b] = process.argv.slice(2);
(cmd === "diff" ? diff(a, b) : cmd === "submit" ? submit(a) : Promise.reject(new Error("usage: indexnow.js diff|submit ...")))
  .catch((e) => console.warn(`[indexnow] ${e.message}`));
