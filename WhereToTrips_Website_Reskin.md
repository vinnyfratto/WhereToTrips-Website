# WhereToTrips.com — Varaus Reskin Tracker

Reskin of the live marketing site to model the flow, look, and structure of the
**Varaus** hotel/travel React template ("Home Style 1"), while keeping WhereTo's
own brand (cream / navy / rust palette, DM Serif Display + Nunito Sans).

- **Decision (updated 2026-07-23):** FULL template match — err toward the Varaus template, not the old site. Recolored to the **app's Azure / Amber / Charcoal** palette (`src/Skins/WanderSkin.ts`) with the app's fonts **RCL Morland** (self-hosted `.ttf` in `src/assets/fonts/`) + **Noto Sans** (Google Fonts). No booking function. Sections built as reusable, CMS-editable blocks.

### Palette (from the app)
| Token | Hex | Role |
|---|---|---|
| Soft Azure `--tint` | `#F2F5F7` | alt section bg |
| White `--cream`/`--card` | `#FFFFFF` | page + cards |
| Charcoal `--navy` | `#313131` | headings, text, hero wash, footer |
| Azure `--azure`/`--rust` | `#209CE0` | primary accent, CTA, links (pressed `#1B86C2`, tint `#E6F4FC`) |
| Amber `--amber` | `#E69800` | secondary accent (stars) |
- **Rollout:** home page first as the reference, then propagate the section styling to the other hubs/leaves.
- **Stack stays:** Eleventy v3 + Nunjucks + plain CSS. No React/Vite migration. One base layout, one `styles.css`, token-driven, section-composed. CMS (Sveltia at `/admin`) stays and is expanded for new elements.

Reference: Varaus live demo — varaus-react.wpocean.com/home. Local template copy at
`D:/_Apps/_Flights/__WhereTo - Reskin/Webpage_Template/varaus-downloadable/varaus`.

---

## Varaus "Home Style 1" section flow → WhereTo mapping

| Varaus section | WhereTo equivalent | Status |
|---|---|---|
| Hero fade-slider + navy overlay + caption | `hero` (new slider mode) | **Done** |
| Transparent nav → solid on scroll | `header` overlay states | **Done** |
| Search / booking bar | *(skipped — no booking on site)* | n/a |
| About split (image + text) | `feature_split` (+ optional 2nd image) | **Done** (styling on-brand; 2nd-image opt-in) |
| Popular Destinations card grid | `collection_grid` image-forward cards | **Done** |
| Rooms (hover-reveal) | photo-card hover zoom + reveal cue | **Done** |
| Testimonials carousel | new `testimonial` section type | **Done** (placeholder quotes) |
| Blog "Latest News" | `insights` `collection_grid` on home | **Done** |
| Footer 4-col + newsletter + social | `footer.njk` newsletter + social icons | **Done** |
| Video banner + modal | optional new section | deferred |

---

## Phases

1. **Foundation** — token cleanup, button treatment, section rhythm. *(partial — hero-scoped so far)*
2. **Chrome** — header nav-on-scroll, hero, footer + newsletter.
3. **Home sections** — restyle feature_split / collection_grid / tile_grid / chat / cta to the Varaus card + rhythm language. Sign-off page.
4. **Roll out** — cascade restyled section classes to How It Works, Travel Vibes, Destinations, Insights, and leaf layouts.

---

## Change log

### Phase 1 — Slider hero (in progress)
- **5 Pexels hero images** fetched → `src/media/hero/` (beach, mountains, city, island, desert). Credits in `src/media/hero/CREDITS.json`. Photography already credited to Pexels in the footer.
- **`sections/hero.njk`** — now dual-mode: renders a full-viewport rotating **slider** when a `slides` list is present; falls back to the original two-column split hero otherwise (so inner hub pages are unchanged).
- **`assets/styles.css`** — added `.hero-slider` block (full-viewport slides, navy readability wash, cream caption, rust-tinted accent, circular arrows, pill→bar active dots) + mobile rules (arrows hidden, vertical overlay). Added `.feature-img-2` for the optional overlapping second image.
- **`layouts/base.njk`** — added a dependency-free vanilla JS slider (auto-rotate 6s, arrows, dots, pause-on-hover, pause when tab hidden, respects `prefers-reduced-motion`).
- **`index.md`** — home hero switched to the 5-slide slider.
- **`feature_split.njk`** — optional `image2` renders as an overlapping accent image (the "two images on a content section" pattern).
- **CMS `admin/config.yml`** — hero gets a `slides` image list (single `image` now optional, used as fallback); feature_split gets an optional `image2`. Both fully editable in Sveltia.

### Phase 2–3 — Full home page + nav (done)
- **Header** — transparent, white logo/links over the hero; on scroll past 72px it re-solidifies (fixed, cream bg, dark links) and slides in. Driven by `body.has-hero-overlay` + `header.scrolled` (JS in `base.njk`). Inner pages keep the original sticky white header, unchanged.
- **Image-forward cards** — `collection_grid` now renders each vibe/destination/insight as a photo card (heroImage, hover zoom, gradient wash, "Explore →" cue). Falls back to the icon tile when no image. New optional `limit` field to cap cards on a page.
- **Home grid tuning** — Featured Vibes: 6 cards, 3-up, centered head. Added a "Latest Insights" blog section (3 posts) to mirror Varaus's blog block.
- **Testimonials** — new `testimonial` section type (3-up cards, star row, serif quote, monogram avatar; scroll-snap on mobile). Seeded with **placeholder** quotes — replace via CMS before launch.
- **Footer** — new 3-zone layout: brand + tagline + **social icons** (Instagram/TikTok/X/Facebook, inline SVG partials), the 4 link columns, and a **newsletter** signup (Web3Forms, intent `newsletter`). Social hrefs are `#` placeholders in `site.json` — set real URLs in CMS → Settings.
- **CMS** — added: `testimonial` section type, `collection_grid` `center` + `limit`, and a Social links editor in Site Settings.

### Full template match (done — verified in-browser via computed styles + geometry)
- **Design system recolored** to Azure/Amber/Charcoal; fonts swapped to RCL Morland (self-hosted @font-face) + Noto Sans. `base.njk` :root rewritten; `theme.json` updated to match. `--rust` repointed to Azure so every accent cascades.
- **Type/rhythm** — RCL Morland headings, italic-serif Azure eyebrows, 110px section rhythm, Varaus-scale h2 (≤54px), hero h1 92px.
- **Buttons** — square-ish Azure `.theme-btn` with the diagonal sheen-wipe hover.
- **Header** — centered nav (logo left / nav center / CTA right), Varaus link style; transparent-over-hero → solid on scroll retained.
- **Hero** — inset frame, charcoal wash, big caption, arrows that slide in on hover, azure dots.
- **Highlights bar** — new section; white card that OVERLAPS the hero bottom (Varaus search-bar position, minus booking). 4 value props.
- **Cards** — collection cards now use the Varaus floating white caption over the image (hover lift + image zoom).
- **Video banner** — new full-width section: charcoal wash, headline, pulsing Azure play button (links to /app/).
- **Testimonials** — Azure bottom-border cards, Amber stars.
- **Footer** — charcoal-dark, social + newsletter (Azure button).
- **CMS** — new section types `highlights` + `video_banner` registered.

### Hero animation + Solar icons (done — verified in-browser via computed styles)
- **Hero caption slide-in matches Varaus exactly:** per-slide captions; each caption child animates `fadeInLeft 1.5s both` (ease) with staggered delays **title 0.5s / subtitle 1s / buttons 1.5s** (eyebrow 0.2s), only on the active slide; inactive hold `fadeOutLeft`. Re-triggers on every slide change. Rotation 5s; respects prefers-reduced-motion. Confirmed: title delay 0.5s, subtitle 1s, btns 1.5s, dur 1.5s, fill both.
- **Solar icon system** (reusable, matches the app): `icon` Eleventy shortcode in `.eleventy.js` renders `@iconify-json/solar` `bold-duotone` via `@iconify/utils` (same as the app's `generate-icons.js`). Usage `{% icon "compass" %}`; unknown names pass through so legacy emoji don't break. `plane` reuses the app's own custom glyph (Solar has no airplane — confirmed). Added `@iconify-json/solar` + `@iconify/utils` devDeps (Actions installs them). Replaced ALL made-up emoji/hand-drawn icons on the home page: highlights (wallet-money/compass/plane/users-group-rounded), why-tiles (global/wallet-money/map-point-favourite/users-group-rounded), Wander Together checklist (check-circle), video play (play). Removed the emoji badge on photo cards. `.ico` base class sizes at 1em (duotone inherits currentColor).
- NOTE: footer social links keep real platform brand logos (Instagram/TikTok/X/Facebook) — Solar has no brand-logo glyphs, so those stay as accurate SVG marks, not invented UI icons.

### Not yet done / next
- Distinct per-vibe / per-destination images (several still reuse a few stock shots).
- Vibe **tabbed hover-reveal** gallery (the Varaus Rooms tabs) — deferred; floating-caption cards cover the destination look for now.
- Turn each section into the documented reusable element set and roll across the other hub/leaf pages.
- Real testimonials + real social URLs before launch.

---

## Notes / watch-outs (from codebase audit)
- Design tokens are split: color/font/width in `theme.json`; grey ramp, radii, shadows hardcoded in `base.njk` `:root`. A full palette change touches both.
- Section palette is mirrored in `admin/config.yml` `&section_types` — new/renamed section *types* or *fields* are a two-file change (markup class changes are safe).
- Base-layout inline JS is coupled to class/attribute names (`.reveal`, `.nav-toggle`, `[data-chip-target]`, and now `[data-hero-slider]`).
- Stray legacy `src/_includes/base.njk` (unreferenced) — candidate for deletion; confirm first.
- **Deploy is push-to-`main`-triggered → the live site updates on push.** Keep reskin work on a branch and merge only when a page is signed off.
