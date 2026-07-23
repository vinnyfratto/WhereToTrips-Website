# WhereToTrips.com — Varaus Reskin Tracker

Reskin of the live marketing site to model the flow, look, and structure of the
**Varaus** hotel/travel React template ("Home Style 1"), while keeping WhereTo's
own brand (cream / navy / rust palette, DM Serif Display + Nunito Sans).

- **Decision:** structure only, keep WhereTo brand. Adopt Varaus's layout language
  (hero, section rhythm, card patterns, motion), not its mint-green colors or Quicksand type.
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

### Not yet done / next
- Assign distinct per-vibe / per-destination hero images (several currently reuse the same few stock shots).
- Optional: video banner section, real testimonials, real social URLs.
- Roll the restyled sections out across the other hub/leaf pages (they already share the CSS, so most cascade for free — needs a visual pass).
- Optional broader button/section-rhythm foundation polish.

---

## Notes / watch-outs (from codebase audit)
- Design tokens are split: color/font/width in `theme.json`; grey ramp, radii, shadows hardcoded in `base.njk` `:root`. A full palette change touches both.
- Section palette is mirrored in `admin/config.yml` `&section_types` — new/renamed section *types* or *fields* are a two-file change (markup class changes are safe).
- Base-layout inline JS is coupled to class/attribute names (`.reveal`, `.nav-toggle`, `[data-chip-target]`, and now `[data-hero-slider]`).
- Stray legacy `src/_includes/base.njk` (unreferenced) — candidate for deletion; confirm first.
- **Deploy is push-to-`main`-triggered → the live site updates on push.** Keep reskin work on a branch and merge only when a page is signed off.
