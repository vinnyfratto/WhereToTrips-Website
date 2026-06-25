# WhereToTrips Website — Build & Progress Tracker

> **Living document.** Single source of truth for the marketing-site rebuild: plan, progress, decisions, Q&A, and direction. Update this as work happens — every session should read this first.

| | |
|---|---|
| **Project** | WhereToTrips marketing website (informational only — booking happens in the app) |
| **Repo** | `vinnyfratto/WhereToTrips-Website` · local: `D:\_Apps\WhereToTrips_Website` |
| **Live domain** | https://wheretotrips.com (GitHub Pages, CNAME) |
| **Source spec** | `C:\Users\vfrat\Downloads\WhereTo_Sitemap_Content_Architecture.docx` — "Site Map & Content Architecture" |
| **Stack** | Eleventy v3 (Nunjucks) → `_site/` → GitHub Actions deploy on push to `main` |
| **CMS** | Sveltia CMS (self-hosted `/admin`) — **decided** |
| **Overall status** | 🚀 **LIVE** — Phases 0–2 deployed to wheretotrips.com (`main` @ 89af2ce, 38 pages). CMS ready at `/admin` (PAT sign-in). Pending: CMS first login, legal-copy review, Phase 3 polish |
| **Last updated** | 2026-06-24 |

---

## 0. How to use this doc

- **Status legend:** `☐ Not started` · `◐ In progress` · `☑ Done` · `⛔ Blocked`
- Tasks use checkboxes — tick them as you go: `- [ ]` → `- [x]`.
- New decisions go in **§10 Decisions & Q&A log** (append, don't overwrite — keep the history).
- Progress notes / dated entries go in **§13 Changelog**.
- When site code changes, bump `package.json` version (see [versioning rule](#14-reference)).

---

## Table of contents
1. [Project snapshot](#1-project-snapshot)
2. [Locked decisions](#2-locked-decisions)
3. [Current state → target](#3-current-state--target)
4. [CMS plan — Sveltia](#4-cms-plan--sveltia)
5. [Information architecture](#5-information-architecture)
6. [Page specifications](#6-page-specifications)
7. [Technical architecture](#7-technical-architecture)
8. [Build phases & task checklists](#8-build-phases--task-checklists)
9. [Inputs needed from stakeholder](#9-inputs-needed-from-stakeholder)
10. [Decisions & Q&A log](#10-decisions--qa-log)
11. [Known issues / tech debt](#11-known-issues--tech-debt)
12. [Do NOT touch](#12-do-not-touch)
13. [Changelog / progress log](#13-changelog--progress-log)
14. [Reference](#14-reference)

---

## 1. Project snapshot

**What we're building:** a multi-page marketing/discovery website that sells the WhereTo concept (budget + vibe in → destination out) and converts visitors to an app download (or early-access signup pre-launch). The website is **informational only** — no booking, no live pricing, no transactions. Every "action" hands off to the iOS/Android app.

**Audiences (in priority order):** travelers (overwhelming majority), content creators/influencers, travel-industry partners, plus press/investors.

**Why GitHub (not WordPress):** decided to stay on the existing static Eleventy + GitHub Pages stack and add a git-based CMS rather than migrate. Zero hosting cost, versioned content, fast, fully owned.

---

## 2. Locked decisions

| # | Decision | Choice | Date |
|---|---|---|---|
| D1 | Platform | **Stay on GitHub Pages + Eleventy** (no WordPress migration) | 2026-06-24 |
| D2 | CMS | **Sveltia CMS**, self-hosted at `/admin`, GitHub auth via Cloudflare Worker. NOT Pages CMS, NOT Decap (neglected/insecure). | 2026-06-24 |
| D3 | Launch state | **One switchable flag**, default **pre-launch** ("Join Early Access"); flips to post-launch ("Get the App" + store badges) in one edit. Never run both at once. | 2026-06-24 |
| D4 | Architecture | Single landing page → **~30-page hub/leaf** site; collections for repeatable leaves; reorderable typed-section blocks for page composition. | 2026-06-24 |
| D5 | Domain | Use **wheretotrips.com** everywhere. Spec's `whereto.com` is a placeholder. | 2026-06-24 |
| D6 | Branding | Keep **Wander Together™** and **Travel Vibes™**. Public "Travel Vibes" pages are distinct from the internal Vibes Engine tool. | 2026-06-24 |

---

## 3. Current state → target

**Today:** one long single-page site (`src/index.njk`) — Header → Hero → Vibes Engine → Wander Together → Conversational Search → Download CTA → Footer. Content in `src/_data/{copy,site,theme}.json`. All CSS inline in `base.njk`. Legal pages exist as static HTML.

**Target:** ~30 routes (hub + leaf), CMS-managed, with GEO/AI-crawler readiness, pre/post-launch toggle, and a flexible section-block page builder.

**Gap = this project.**

---

## 4. CMS plan — Sveltia

**What it is:** free, open-source, git-based headless CMS — the actively-maintained successor to Netlify/Decap CMS (v0.167.x, GA targeted mid-2026; ships multiple times/week). Reads a Decap-compatible `config.yml`. Strong support for typed-block lists (our flexible page builder), media library with Pexels/Unsplash search built in.

### 4.1 How it works / auth

```
src/admin/index.html + config.yml   → served at wheretotrips.com/admin
Editor → /admin → "Log in with GitHub"
Cloudflare Worker (sveltia-cms-auth) → handles GitHub OAuth handshake   ← the one piece of infra
Save → commits to repo via GitHub API → existing Action rebuilds → live in ~1 min
```

- **Auth worker:** deploy Sveltia's official `sveltia-cms-auth` to Cloudflare Workers (free tier, one-time ~10 min). Register a GitHub OAuth app, set `base_url` in config. Single-editor fallback: personal-access-token mode (no worker).
- Content stays versioned in git — every edit is a commit, fully reversible.

### 4.2 Collections (repeatable → add/remove pages from the CMS)

| Collection | Folder | Generates | Notes |
|---|---|---|---|
| Travel Vibes | `src/content/travel-vibes/` | `/travel-vibes/{slug}` | 10 to start; fixed leaf template |
| Destinations | `src/content/destinations/` | `/destinations/{slug}` | curated lists; cross-link to a vibe |
| Insights | `src/content/insights/` | `/insights/{slug}` | byline + "Last updated"; category field |
| Creator Directory | `src/content/creators/` | listed on `/partners/creators/directory` | profile cards |
| FAQ items | `src/content/faqs/` | accordion on `/faq` | category field |
| Press items | `src/content/press/` | listed on `/press` | logo + link |
| Pages (generic) | `src/content/pages/` | arbitrary new routes | for brand-new pages |

### 4.3 Section block palette (flexible page builder)

Marketing pages are a **reorderable `list` of typed blocks** the editor can add / delete / drag. Each maps to a Nunjucks partial in `src/_includes/sections/`. Initial palette:

- `hero` — split headline (pre/accent/post), lede, primary + secondary CTA, image, optional floating badge
- `feature_split` — eyebrow, title, lede, body, image, optional stat badges, L/R flip
- `tile_grid` — eyebrow, title, intro, tiles[] {label, icon/image, href, blurb} (vibes grid, use-case tiles, benefit cards, partner-types grid)
- `steps` — numbered step list (How It Works 4 steps)
- `stat_band` — "by the numbers" citable stats (GEO asset)
- `chat` — conversational-search example bubbles
- `faq_accordion` — pulls FAQ items
- `cta_band` — download/early-access band
- `store_badges` — App Store / Google Play + QR (respects launch flag)
- `email_capture` — early-access OR "email me the link" (tagged)
- `gallery` — screenshots / images
- `rich_text` — freeform markdown

> **Honest boundary:** editors add/remove/reorder from this palette. A brand-new *kind* of section (new layout) is a dev task — true of every git CMS. This is "component-based page building," not a blank canvas.

### 4.4 Media

Uploads land in `src/media/` (passthrough-copied). Drag-drop, paste-screenshot, plus built-in Pexels/Unsplash/Pixabay search. **Migrate current hot-linked Pexels images into `src/media`** during Phase 0.

### 4.5 Editor access

GitHub collaborators on the repo can log in. Add Chris (`ccupero@…`) as a collaborator at launch.

---

## 5. Information architecture

### 5.1 Sitemap tree

```
wheretotrips.com
├─ /                          Home                     [page + sections]
├─ /app                       Get the App              [page]   ← #1 CTA target site-wide
├─ /how-it-works              How It Works             [page + sections]
├─ /wander-together           Wander Together™         [page + sections]
├─ /travel-vibes              Travel Vibes (hub)       [auto-lists collection]
│   └─ /travel-vibes/{slug}   10 vibe leaf pages       ▶ COLLECTION
├─ /destinations             Destinations (hub)        [auto-lists collection]
│   └─ /destinations/{slug}   curated list leaves       ▶ COLLECTION
├─ /insights                  Insights (hub, paged)    [auto-lists collection]
│   └─ /insights/{slug}       editorial posts          ▶ COLLECTION
├─ /partners/creators         For Creators             [page]
│   └─ …/creators/directory   Creator Directory        ▶ COLLECTION
├─ /partners/industry         For Industry Partners    [page + inquiry form]
├─ /faq                       FAQ (accordion)          ▶ COLLECTION
├─ /about                     About Us                 [page]
├─ /press                     Press & Media            [page + collection]
├─ /contact                   Contact (segmented)      [page + form]
├─ /legal/privacy             Privacy Policy           [markdown]
├─ /legal/terms               Terms of Service         [markdown]
├─ /robots.txt                AI-crawler policy (§7.4)
└─ /sitemap.xml               auto-generated
```

### 5.2 Navigation

**Primary (traveler-facing):**
`Home | How It Works | Travel Vibes | Destinations | Wander Together™ | Insights | Partner With Us ▾ | [CTA button]`

- **Partner With Us ▾** dropdown → For Content Creators & Influencers · For Travel Industry Partners
- **CTA button** = launch-flag driven: pre-launch "Join Early Access" → post-launch "Get the App". Never both.

**Footer:** Get the App (badges) · About Us · Press & Media · Contact · FAQ · Privacy Policy · Terms of Service

### 5.3 Page inventory & status

| Page | Route | Model | CTA | Status |
|---|---|---|---|---|
| Home | `/` | page+sections | Get the App | ☑ |
| Get the App | `/app` | page | install / email | ☑ |
| How It Works | `/how-it-works` | page+sections | Get the App | ☑ |
| Wander Together | `/wander-together` | page+sections | Start a Group Trip | ☑ |
| Travel Vibes hub | `/travel-vibes` | hub | Explore a Vibe | ☑ |
| Travel Vibes leaves ×10 | `/travel-vibes/*` | collection | Find My [Vibe] Trip | ☑ (10) |
| Destinations hub | `/destinations` | hub | See My Matches | ☑ |
| Destinations leaves | `/destinations/*` | collection | See My Matches | ◐ (4 sample lists; add more in P3) |
| Insights hub | `/insights` | hub | — | ☑ |
| Insights posts | `/insights/*` | collection | — | ☑ (3) |
| For Creators | `/partners/creators` | page | Apply | ☑ |
| Creator Directory | `/partners/creators/directory` | collection | — | ◐ (empty-state pre-launch) |
| For Industry | `/partners/industry` | page+form | Become a Partner | ☑ |
| FAQ | `/faq` | page+accordion | — | ☑ |
| About | `/about` | page | — | ☑ (founder names TBD, Q3) |
| Press & Media | `/press` | page | — | ☑ (no coverage yet) |
| Contact | `/contact` | page+form | — | ☑ |
| Privacy | `/legal/privacy` | markdown | — | ☑ (draft — needs counsel) |
| Terms | `/legal/terms` | markdown | — | ☑ (draft — needs counsel) |
| robots.txt | `/robots.txt` | generated | — | ☑ |
| sitemap.xml | `/sitemap.xml` | generated | — | ☑ |

---

## 6. Page specifications

> Content blocks pulled from the spec. CTAs use **discovery-oriented** language ("see your matches in the app"), never "book now."

### 6.1 Home `/`
- Hero: headline, subheadline, primary CTA (Get the App), secondary CTA (Join Early Access — pre-launch only)
- Problem framing: "Where do you want to go?" vs. what people actually know (budget, dates, who, vibe)
- How It Works preview: 4 steps (Budget → Vibe → Discover → Book in the app) → `/how-it-works`
- Wander Together™ teaser → `/wander-together`
- Why Travelers Love WhereTo: 4 cards (Travel More, Stay On Budget, Discover Hidden Gems, Easy Group Travel)
- Featured Travel Vibes: tile grid → vibe leaves
- App download badges near footer (+ early-access form pre-launch)
- **SEO:** conversion-focused, not a keyword leaf. State plainly + early that WhereTo is an iOS/Android app.

### 6.2 Get the App `/app`  (interstitial — most important conversion page)
- Hero: "Get the WhereTo App" + App Store & Google Play badges, above the fold
- "What you can do in the app" list (personalized matches, Wander Together, book flights/hotels/activities)
- 2–3 screenshots or short demo
- **QR code** for desktop visitors → store listing (resolves the #1 drop-off without a form)
- Secondary (below fold): "Not ready yet? Email me the download link" — single field, distinct from early-access
- One-line cost statement (free to download; in-app booking) → full detail in FAQ
- **Design principle:** store badges first, email capture as fallback — do NOT gate badges behind email.
- **Retargeting flags:** tag this submission distinctly from Early Access + Insights newsletter (3 intents, 3 sequences); suppress install reminders after first-open; resend at ~1h and ~3 days.

### 6.3 How It Works `/how-it-works`
- Budget First (reframe destination-first search)
- Travel Vibes™ (how preference input works)
- Smart Recommendations (inputs: flights, hotels, seasonality, weather, events, budget)
- Where booking happens: explicit closing — recommendations/flights/hotels/booking all happen **in the app** + store badges. Do not simulate a booking flow.
- **SEO:** canonical home for "how does WhereTo work" / "AI travel planning". State app requirement plainly & early.

### 6.4 Wander Together™ `/wander-together`
- Problem framing (too many opinions, budgets, interests, departure cities)
- How it works: invite friends → everyone shares prefs in the app → AI finds overlap → group votes → book together in the app
- Use-case tiles: Friends Trip, Family Vacation, Bachelor/Bachelorette, Couples Getaway, Reunion, Corporate Retreat
- CTA: Get the App to Start a Group Trip
- **SEO:** each tile is a future leaf candidate (e.g. `/wander-together/bachelorette-trip-planning`) once traffic justifies.

### 6.5 Travel Vibes hub `/travel-vibes`
- Grid of all vibes: Adventure, Beach Escape, Foodie, Romantic, Hidden Gems, Family Fun, Luxury, Outdoor Explorer, Culture & History, Nightlife
- Each tile → its leaf. **Cross-link every vibe to 3–5 matching destinations.**
- Intent: experience-led ("romantic getaway ideas").

**Leaf template `/travel-vibes/{slug}`** (fixed, repeats per vibe):
- Hero: vibe name, evocative imagery, one-line description
- "What makes this a [Vibe] trip" — 3–4 defining characteristics
- Sample destinations (cards → destination leaves)
- Budget ranges typical for this vibe (e.g. "$800–$1,500 for a long weekend")
- CTA: Get the App / Find My [Vibe] Trip

### 6.6 Destinations hub `/destinations`
- Curated lists: Trending Under $2,000, Best Beach Destinations Under $1,500, Hidden Gems From Texas, Weekend Escapes From San Antonio, Best Fall Getaways
- Filter/sort entry points by budget, origin airport, season
- Intent: constraint-led. **Frame lists as illustrative/inspirational, not live bookable inventory.** Cross-link each back to a Travel Vibe.

### 6.7 Insights `/insights`
- Hub + categories: Travel Inspiration, Budget Travel, Group Travel, Hidden Gems, Travel Trends, AI & Travel
- Posts: byline + credentials + **visible "Last updated" date** (GEO recency signal)

### 6.8 For Creators `/partners/creators`
- Why Partner With WhereTo
- Benefits: affiliate revenue, co-branded destination collections, featured creator profiles, audience engagement tools, early feature access
- Link to Creator Directory (social proof)
- CTA: Apply To Become A Creator Partner

### 6.9 For Industry Partners `/partners/industry`
- The Problem (suppliers compete only after destination chosen; WhereTo engages earlier)
- Platform overview: AI Discovery Engine, Wander Together™, Booking Integration
- Why Partner: earlier-funnel access, incremental demand, group travel, data-driven recs
- Partner types grid: Airlines, Hotels, Vacation Rentals, Cruise Lines, Tourism Boards, Activity Providers, Booking Technology Partners
- Contact form · CTA: Become A Partner

### 6.10 FAQ `/faq`
Cover: how recommendations are generated · where booking happens (app, not website) · free to download + how WhereTo makes money (commission, if applicable) · what "early access" means + when the app opens · cancellation/change policy (in-app) · Wander Together privacy for group members · how budgets/prices stay accurate.

### 6.11 About `/about`
- Headline: "Reimagining How The World Plans Travel"
- Story: traditional travel search hasn't changed in decades; WhereTo starts with possibility, not a destination
- Founders: Vinny Fratto, Chris Cupero — **⚠ public names TBD (see Q3)**
- Vision: make travel discovery as intelligent as travel booking

### 6.12 Contact `/contact`
Segmented routing: Travelers (questions/support) · Creators (→ 6.8) · Travel Industry (→ 6.9)

### 6.13 Press & Media `/press`
Singleton intro + press-item collection (logo, outlet, link, date).

### 6.14 Legal
- **Privacy `/legal/privacy`** — covers website data (email, departure airport, prefs via forms) + relationship to the app's own privacy policy.
- **Terms `/legal/terms`** — website is informational only; no purchases/bookings on the website; booking governed by the separate app ToS (linked).

---

## 7. Technical architecture

### 7.1 Proposed Eleventy structure

```
src/
  _data/
    site.json        brand, nav, footer, contact, launch flag, form endpoints, store URLs
    theme.json       colors, fonts, maxWidth
  _includes/
    layouts/   base.njk · page.njk (renders sections[]) · vibe.njk · destination.njk · insight.njk
    sections/  hero · feature-split · tile-grid · steps · stat-band · chat · faq-accordion ·
               cta-band · store-badges · email-capture · gallery · rich-text
    partials/  header · footer · meta (title/desc/canonical/og) · store-buttons · qr · app-disclaimer
  content/
    pages/ · travel-vibes/ · destinations/ · insights/ · creators/ · faqs/ · press/
  media/             uploaded images
  admin/index.html   Sveltia CMS
  robots.njk → robots.txt
  sitemap.njk → sitemap.xml
  index.njk          home
```

- Refactor the inline CSS in `base.njk` into a shared stylesheet (or section-scoped partials). Keep the existing design tokens.
- Hubs use Eleventy collections + pagination to auto-list leaves.

### 7.2 Pre/post-launch toggle
- `site.launchMode: "pre" | "post"` (CMS select field).
- Templates branch on it: nav CTA label/href, hero secondary CTA visibility, `/app` lead (badges-first vs email-first), all `cta_band`/`store_badges` blocks.
- Store URLs + early-access endpoint live in `site.json`. Flip = one CMS edit.

### 7.3 Forms (static site → no-backend service)
- Provider: **Web3Forms or Formspree (free tier)** — endpoints in `site.json`.
- Submission tags (3+ distinct intents → distinct email sequences): `early_access`, `app_link`, `contact_traveler`, `contact_creator`, `partner_industry`, `insights_newsletter`.

### 7.4 GEO / AI discoverability (spec §6)
- ✅ Eleventy is statically rendered → satisfies "no JS-gated content" (the one hard AI-crawler requirement).
- **robots.txt** (corrected sitemap host):

```
# WhereTo — AI crawler policy
# Review GPTBot (training) as a deliberate decision — left allowed below.
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

# Keep partner/admin/account areas out of all crawlers
User-agent: *
Disallow: /admin/
Disallow: /account/
Disallow: /api/

Sitemap: https://wheretotrips.com/sitemap.xml
```

- Auto **sitemap.xml**; per-page `<title>`/meta/canonical/OG via the `meta` partial.
- **Visible** "WhereTo is an iOS/Android app — the website doesn't support booking" statement on every recommendation/booking page (not just metadata).
- Discovery-oriented CTAs only ("see your matches in the app").
- **No** Product/Offer/booking schema (there's no web transaction to describe).
- "Last updated" on Insights; refresh cornerstone Vibes/Destinations quarterly.
- Submit to **Bing Webmaster Tools** (ChatGPT search uses Bing's index) + **Google Search Console**.
- Do NOT pair `Disallow` with page-level `noindex` on the same path.
- **Skip** (per spec §6.5): llms.txt, artificial chunking, schema-stacking, paid brand mentions.

### 7.5 Design system / tokens (keep existing)
- Colors: cream `#F0EBE0`, card `#FDFAF6`, navy `#1C3649`, navyLight `#2A4D65`, rust `#B85C38`
- Fonts: DM Serif Display (headings) + Nunito Sans (body); maxWidth 1080px
- Matches the app's WanderSkin. All tokens stay CMS-editable in `theme.json`.

---

## 8. Build phases & task checklists

### Phase 0 — Foundation  `◐ In progress (build done, hand-off pending)`
- [x] Refactor `index.njk`/`base.njk` → layouts + section partials; extract CSS → `src/assets/styles.css`
- [x] Build `page.njk` that renders a `sections[]` block list (dynamic `{% include %}` by `type`)
- [x] Fix corrupted `nav`/`footerCols` in `site.json`; build primary nav (+ Partner dropdown) & footer
- [x] Add `launchMode` flag + wire CTA/badge branching (header CTA + `cta_band` switch pre/post)
- [x] Localize Pexels images → `src/media` (hero/vibes/together/chat)
- [x] Add `robots.txt` + `sitemap.xml` (vibes-engine excluded from sitemap; served verbatim)
- [x] Stand up Sveltia: `src/admin/index.html` + `config.yml` (collections + 9-type section palette + media)
- [x] Home page converted to section system; build verified green locally (`npm run build`, 0 errors, 0 template leaks)
- [x] Bump `package.json` version → **1.1.0**
- [x] Wire form provider in `site.json` — Web3Forms **live key in place** (`a7729135…`); verified rendered into form HTML
- [x] **Pushed `rebuild/phase-0` → `main`** (fast-forward, 89af2ce) → GitHub Pages deploy triggered (run 28148964130). **Site is live.**
- [~] CMS auth — config now PAT-first (no worker needed for single editor). OAuth `sveltia-cms-auth` Cloudflare Worker is the optional multi-user upgrade (see Q4).

### Phase 1 — Traveler pages  `☑ Built & verified locally`
- [x] Home — rebuilt to full §6.1 (hero, how-it-works steps, vibes, benefit cards, featured-vibes grid, Together, chat, CTA)
- [x] How It Works (`/how-it-works/`) — steps + Smart Recommendations split + "where booking happens"
- [x] Wander Together™ (`/wander-together/`) — problem framing, steps, 6 use-case tiles
- [x] Get the App (`/app/`) — launch-aware install band, "what you can do", QR for desktop, "email me the link" fallback
- [x] Travel Vibes hub + **10 leaf pages** (collection `vibe`, fixed `vibe.njk` template, sorted by `order`)
- [x] Destinations hub + **4 curated-list leaves** (collection `destination`, `destination.njk`) — more lists added as needed
- [x] FAQ (`/faq/`) — accordion with 8 Q&As (recs, booking-in-app, cost, early access, cancellation, group privacy, accuracy, devices)
- [x] Cross-link vibes ↔ destinations (destination leaves link back to a related vibe)
- New infra: `collection_grid` section + `vibe.njk`/`destination.njk` layouts + `vibe`/`destination` collections in `.eleventy.js`
- ⚠ Per-vibe/destination **photography reused from the 4 Phase-0 images** — real per-page curation deferred to Phase 3 (or drop via CMS)

### Phase 2 — Partner / Company / Legal  `☑ Built & verified locally`
- [x] For Creators (`/partners/creators/`) + Creator Directory (`/partners/creators/directory/`, honest pre-launch empty-state)
- [x] For Industry Partners (`/partners/industry/`) — problem, platform, why, 7 partner types, inquiry form
- [x] About (`/about/`) — story, principles, vision (founder names omitted pending Q3)
- [x] Press & Media (`/press/`) — boilerplate, brand assets (logo link), media-inquiry form
- [x] Contact (`/contact/`) — segmented audience cards + traveler support form
- [x] Insights hub (`/insights/`) + **3 posts** (collection `insight`, byline + "Last updated", `insight.njk`)
- [x] Privacy & Terms at `/legal/privacy/` + `/legal/terms/` (website-scoped, link to the app policies at `/privacy/` `/terms/` which stay untouched)
- New infra: `contact_form` section (Web3Forms, configurable intent), `insight.njk` + `legal.njk` layouts, `insight` collection
- ⚠ **Legal copy is a first draft — have counsel review before launch.** ⚠ Founder names omitted (Q3 open).

### Phase 3 — Content + GEO polish  `☐ Not started`
- [ ] Seed real content into all collections
- [ ] Per-page meta/canonical/OG pass + visible app-only statements
- [ ] "By the numbers" citable stat (GEO asset)
- [ ] Submit to Bing Webmaster Tools + Google Search Console
- [ ] Add Chris as repo collaborator; CMS walkthrough

---

## 9. Inputs needed from stakeholder

| Needed by | Input | Status / default |
|---|---|---|
| End of Phase 0 | Cloudflare account (free) + GitHub OAuth App for auth worker | ✅ Plan set: I prep everything; stakeholder does a ~10-min deploy+OAuth handoff at the auth step (see Q4). |
| Phase 0 | Form handler | ✅ **Web3Forms** (free tier) confirmed |
| Phase 1–2 | Founders' names public? (see Q3) | ☐ — default: omit until confirmed |
| At launch | Real App Store + Google Play URLs | ☐ |
| At launch | 2–3 app screenshots for `/app` | ☐ |
| Phase 3 | The "average savings" / proprietary stat | ☐ |

---

## 10. Decisions & Q&A log

> Append new entries; keep history. ✅ answered · ⏳ open.

- **Q1 — CMS approach?** ✅ *Sveltia CMS* (self-hosted). User initially leaned toward Decap/Sveltia; after comparison, chose Sveltia (Decap is neglected/insecure; Pages CMS weaker on section-blocks + third-party-hosted). — 2026-06-24
- **Q2 — Launch state?** ✅ *Build switchable, default pre-launch.* One flag flips the whole site. — 2026-06-24
- **Q3 — Founders' names public on About page?** ⏳ Open. About page built with names **omitted** (company voice); flip when decided.
- **Q4 — Cloudflare account / auth-worker ownership?** ✅ *I handle all prep; stakeholder does the account-gated steps via a hand-off checklist.* **Sequencing decided: the worker is the LAST task of Phase 0**, not first — nothing depends on it and the CMS config is validated locally (Sveltia no-auth local mode) beforehand. Stakeholder's ~10-min part: (1) Cloudflare deploy of `sveltia-cms-auth` → worker URL; (2) create GitHub OAuth App (exact field values supplied) → Client ID + Secret; (3) paste secrets + domain into worker env; (4) send worker URL → I set `base_url`. I cannot create their accounts or read their secrets. — 2026-06-24
- **Q5 — Form provider?** ✅ *Web3Forms* (free tier). — 2026-06-24
- **Q6 — Keep contact email `ccupero@vcinnovationsgroup.com`, or use a wheretotrips.com address?** ⏳ Open.
- **Q7 — Insights at launch: build the engine now, or stub the hub and add posts later?** ⏳ Open (currently scheduled Phase 2/3).

---

## 11. Known issues / tech debt

- ✅ **FIXED (P0)** — `site.json` nav/footerCols corruption (`"[object Object]"`); now proper arrays, 0 leaks in build.
- ✅ **FIXED (P0)** — Pexels images localized into `src/media`.
- ✅ **FIXED (P0)** — inline CSS extracted to `src/assets/styles.css`; only color/font tokens remain templated in `<head>`.
- **Spec uses `whereto.com`** — placeholder; real domain is wheretotrips.com (using real everywhere).
- **`.pages.yml` (old Pages CMS) and `src/_data/copy.json` removed** — superseded by Sveltia config + front-matter sections.
- **Legal pages** still at `/privacy/` `/terms/` (old HTML); move to `/legal/*` in P2.
- **Per-page photography (P1)** reuses the 4 Phase-0 Pexels images across vibe/destination leaves — curate real per-page images in P3 (or via CMS).
- **`/app` QR code** uses an external generator (`api.qrserver.com`) at runtime — fine for now; consider a build-time/static QR before launch.
- ⚖️ **Legal copy is a first draft.** `/legal/privacy` + `/legal/terms` are reasonable starting language but **must be reviewed by counsel before launch** (and reconciled with the app policies at `/privacy/` `/terms/`).
- **Favicon is SVG-only** — modern browsers fine. Add `favicon.ico` (legacy) + `apple-touch-icon.png` 180×180 (iOS home-screen) before launch; needs a rasterizer (online converter or `sharp`/ImageMagick) since none is installed locally.
- **Deploy blocker:** primary nav still links to `/insights/` and the Partner dropdown + footer link to `/partners/*`, `/about`, `/press`, `/contact`, `/legal/*` — all **Phase 2**. Don't push to `main` until those exist (or temporarily trim nav), or the live nav 404s.

---

## 12. Do NOT touch

- **`src/vibes-engine/`** — the internal Vibes Engine tool (passthrough-copied). NOT the public "Travel Vibes" marketing pages. Leave it alone.
- **Branding:** "Wander Together™" and "Travel Vibes™" are intentional — do not rename.
- **DNS / Pages settings gotcha:** switching Pages build_type legacy→workflow clears the custom domain; A-records on `@` → 185.199.108–111.153, CNAME `www` → vinnyfratto.github.io. (See project memory.)

---

## 13. Changelog / progress log

- **2026-06-24** — Reviewed spec docx; audited current repo; locked D1–D6; chose Sveltia after CMS deep-dive. Created this tracker. Status: planning complete, ready for Phase 0. No site code changed yet.
- **2026-06-24** — Resolved Q4 (auth worker = last task of Phase 0, stakeholder hand-off; I prep all) + Q5 (Web3Forms). Ready to commit tracker and begin Phase 0.
- **2026-06-24** — Web3Forms live access key added to `site.json` (form "WhereToTrips", domain wheretotrips.com); one key serves all forms, differentiated by hidden `intent`. Build re-verified.
- **2026-06-25** — **CMS config caught up to the full site.** The Phase-0 scaffold only registered Home; expanded `config.yml` to 14 editable pages (shared anchored section palette incl. `collection_grid` + `contact_form`) + Travel Vibes / Destinations / Insights folder collections (add-remove) + Legal + Settings. Validated YAML via js-yaml. Deployed (f326157). Editors now see the whole site at `/admin`, not just Home.
- **2026-06-25** — **WENT LIVE.** Synced lockfile to 1.1.0, set CMS auth to PAT-first, fast-forwarded `main` → `89af2ce`, pushed → GitHub Pages deploy (run 28148964130). The full Phases 0–2 site replaces the old single-page site at wheretotrips.com. App policies at `/privacy/` `/terms/` and `/vibes-engine/` preserved.
- **2026-06-25** — **Phase 2 built on `rebuild/phase-0`.** Added For Creators, Creator Directory (empty-state), For Industry, About, Press, Contact, Insights hub + 3 posts, and `/legal/privacy` + `/legal/terms` (website-scoped, linking to the untouched app policies at `/privacy/` `/terms/`). New infra: `contact_form` section, `insight.njk` + `legal.njk` layouts, `insight` collection. Fixed a build break (reserved `date` field → renamed to `published`). Build green: **38 HTML pages, 0 leaks, and a full internal-link crawl found 0 broken links** → site is nav-coherent and deployable. Legal copy is a draft pending counsel.
- **2026-06-25** — Brand: added `src/favicon.svg` (white globe icon on navy #1F3A4D, from `WhereTo_Logo.svg`), wired `<link rel=icon>` + `theme-color`; replaced header/footer "W" monogram with the full `whereto-logo.svg` wordmark. No local rasterizer (Win `convert` ≠ ImageMagick) → SVG-only favicon; PNG/ICO + apple-touch are a pre-launch follow-up.
- **2026-06-24** — **Phase 1 built on `rebuild/phase-0`.** Added Home (full §6.1), How It Works, Wander Together, Get the App (QR + email fallback), Travel Vibes hub + 10 leaves, Destinations hub + 4 lists, FAQ. New infra: `collection_grid` section, `vibe.njk`/`destination.njk` layouts, `vibe`/`destination` Eleventy collections (sorted by `order`). Build green: **26 outputs / 24 HTML pages, 0 template leaks**; hubs + home pull collections correctly. Photography reused from 4 P0 images (curation = P3). Still local — not pushed.
- **2026-06-24** — **Phase 0 built on branch `rebuild/phase-0`.** New architecture: `layouts/base.njk` + `layouts/page.njk` (section renderer) + `partials/` (header w/ partner dropdown, footer, meta, store-buttons, app-disclaimer) + `sections/` (hero, feature_split, chat, cta_band, tile_grid, steps, rich_text, email_capture, faq_accordion). CSS extracted → `assets/styles.css`. `site.json` rebuilt (nav/footer/launchMode/store/forms). Home migrated to `index.md` front-matter sections. Added `robots.txt` + `sitemap.xml`. Sveltia CMS scaffolded (`admin/index.html` + `config.yml`). Removed `index.njk`, `.pages.yml`, `copy.json`. `package.json` → 1.1.0. `npm run build` green: 0 errors, 0 template leaks, 0 `[object Object]`. Not pushed — `main` untouched, nothing deployed.

---

## 14. Reference

- **Spec:** `C:\Users\vfrat\Downloads\WhereTo_Sitemap_Content_Architecture.docx`
- **Sveltia:** https://github.com/sveltia/sveltia-cms · auth worker https://github.com/sveltia/sveltia-cms-auth · docs https://sveltiacms.app
- **Eleventy:** https://www.11ty.dev
- **Versioning rule:** bump `package.json` version on every site change (website schema; the app's versionCode rule is separate).
- **Deploy:** push to `main` → `.github/workflows/deploy.yml` → GitHub Pages. Pages build_type = **workflow** (not branch).
