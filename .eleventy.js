module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/media");
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/.nojekyll");
  eleventyConfig.addPassthroughCopy("src/vibes-engine");
  eleventyConfig.addPassthroughCopy("src/DestImages");
  eleventyConfig.addPassthroughCopy("src/vibesimages");
  eleventyConfig.addPassthroughCopy("src/DashboardHero");

  // Admin is copied verbatim (Sveltia CMS) — keep it out of template processing.
  eleventyConfig.ignores.add("src/admin/**");

  // Vibes Engine is an internal tool — copy it verbatim, but keep it out of
  // collections/sitemap so it isn't advertised to search/AI crawlers.
  eleventyConfig.ignores.add("src/vibes-engine/**");

  // Destination Images admin tool — same treatment as Vibes Engine: copied
  // verbatim, kept out of collections/sitemap.
  eleventyConfig.ignores.add("src/DestImages/**");

  // Vibe Images admin tool — same treatment: copied verbatim, kept out of
  // collections/sitemap.
  eleventyConfig.ignores.add("src/vibesimages/**");

  // Dashboard Hero admin tool — same treatment: copied verbatim, kept out of
  // collections/sitemap.
  eleventyConfig.ignores.add("src/DashboardHero/**");

  // Markdown filter — renders doc strings to HTML for the (internal) TechDocs page.
  const md = require("markdown-it")({ html: true, linkify: true, breaks: false });
  eleventyConfig.addFilter("markdown", (str) => (str ? md.render(String(str)) : ""));

  // ── Solar icons ────────────────────────────────────────────────────────────
  // Same set/renderer as the app (@iconify-json/solar, bold-duotone). Usage:
  //   {% icon "compass" %}  or  {% icon "compass", "big" %}  (adds class ico-big)
  // Unknown names pass through unchanged so emoji/legacy values still render.
  // `plane`/`globe` mirror the app's own custom glyphs (Solar has no airplane).
  const { getIconData, iconToSVG, iconToHTML, replaceIDs } = require("@iconify/utils");
  const solar = require("@iconify-json/solar/icons.json");
  const ICON_STYLE = "bold-duotone";
  const ICON_CUSTOM = {
    plane:
      '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 26.7 26.7">' +
      '<path fill="currentColor" d="M23.2,2.3c.4,0,.7.1.9.3,1.1,1.1-.6,4.2-4,7.6s-.1.2,0,.3l.7,1.6c0,.2.3.2.4.1s.3-.2.5-.2.3,0,.3.1c.3.3.1.8-.4,1.3s-.1.2,0,.3l.8,1.8c0,.2.3.2.4.1s.3-.2.5-.2.3,0,.3.1c.3.3.1.8-.4,1.2s-.1.2,0,.3l1.2,2.7s0,0,0,0v1.9c.1.3-.2.4-.4.2l-6.9-8.7c0-.1-.3-.1-.4,0s0,0,0,0c-2.6,2.1-5,3.9-6.9,5.2s-.1.1-.1.2l-.2,4.8c0,.3-.4.4-.5.1l-1.8-3c0-.1-.2-.2-.4,0-.3.2-.6.3-.7.3s0,0,0,0c0,0,0-.3.3-.7s0-.3,0-.4l-3-1.8c-.2-.1-.1-.5.1-.5l4.8-.2c0,0,.2,0,.2-.1,1.3-1.9,3.2-4.3,5.2-6.9,0,0,0,0,0,0,0-.1,0-.3,0-.4L4.6,2.9c-.2-.2,0-.5.2-.5h1.9c0,.1,0,.1,0,.1l2.7,1.2c.1,0,.2,0,.3,0,.3-.3.6-.6.9-.6s.2,0,.3.1c.2.2.2.5,0,.8s0,.3.1.4l1.8.8c.1,0,.2,0,.3,0,.3-.4.6-.6.9-.6s.2,0,.3.1c.2.2.2.5,0,.8s0,.3.1.4l1.6.7c.1,0,.2,0,.3,0,2.7-2.7,5.2-4.4,6.7-4.4M23.2,0c-2.1,0-4.5,1.6-6.5,3.4s-.3,0-.4,0-.1-.1-.2-.2c-.5-.5-1.2-.8-1.9-.8s-.5,0-.7,0-.2,0-.3-.1c-.1-.2-.3-.5-.5-.7-.5-.5-1.2-.8-1.9-.8s-.9,0-1.3.3-.2,0-.2,0l-1.5-.7c-.2-.1-.5-.2-.8-.2l-2.8-.2s0,0-.1,0C3,0,2.2.7,1.8,1.5c-.4.9,0,2,.7,2.6l7.7,6.1c.1,0,.1.3,0,.4-1.2,1.6-2.3,3-3.3,4.3s-.1.1-.2.1l-4.6.2c-1,0-1.9.7-2.1,1.7-.2,1,.2,2,1.1,2.5l2.4,1.4c0,0,.1.1.1.2,0,.5.2.9.6,1.3.4.4.9.6,1.4.7s.2,0,.2.1l1.4,2.4c.4.7,1.2,1.1,1.9,1.1s.4,0,.5,0c1-.2,1.7-1.1,1.7-2.1l.2-4.6c0,0,0-.2.1-.2,1.3-1,2.8-2.1,4.3-3.3s.3,0,.4,0l6.1,7.7c.4.6,1.1.9,1.8.9s.5,0,.8-.1c.9-.4,1.5-1.3,1.4-2.3l-.2-2.8c0-.3,0-.5-.2-.8l-.7-1.5c0,0,0-.2,0-.2.2-.3.3-.7.3-1,0-.8-.2-1.6-.8-2.2-.2-.2-.4-.4-.7-.5s-.2-.2-.1-.3,0-.3,0-.5c0-.8-.2-1.6-.8-2.2,0,0-.1-.1-.2-.2-.1,0-.1-.3,0-.4,1.8-2,3.4-4.4,3.4-6.5,0-1.3-.5-2.1-1-2.5-.5-.5-1.3-1-2.5-1h0Z"/>' +
      '<path fill="currentColor" opacity=".5" d="M23.2,2.3c.4,0,.7.1.9.3,1.1,1.1-.6,4.2-4,7.6s-.1.2,0,.3l.7,1.6c0,.2.3.2.4.1s.3-.2.5-.2.3,0,.3.1c.3.3.1.8-.4,1.3s-.1.2,0,.3l.8,1.8c0,.2.3.2.4.1s.3-.2.5-.2.3,0,.3.1c.3.3.1.8-.4,1.2s-.1.2,0,.3l1.2,2.7s0,0,0,0v1.9c.1.3-.2.4-.4.2l-6.9-8.7c0-.1-.3-.1-.4,0s0,0,0,0c-2.6,2.1-5,3.9-6.9,5.2s-.1.1-.1.2l-.2,4.8c0,.3-.4.4-.5.1l-1.8-3c0-.1-.2-.2-.4,0-.3.2-.6.3-.7.3s0,0,0,0c0,0,0-.3.3-.7s0-.3,0-.4l-3-1.8c-.2-.1-.1-.5.1-.5l4.8-.2c0,0,.2,0,.2-.1,1.3-1.9,3.2-4.3,5.2-6.9,0,0,0,0,0,0,0-.1,0-.3,0-.4L4.6,2.9c-.2-.2,0-.5.2-.5h1.9c0,.1,0,.1,0,.1l2.7,1.2c.1,0,.2,0,.3,0,.3-.3.6-.6.9-.6s.2,0,.3.1c.2.2.2.5,0,.8s0,.3.1.4l1.8.8c.1,0,.2,0,.3,0,.3-.4.6-.6.9-.6s.2,0,.3.1c.2.2.2.5,0,.8s0,.3.1.4l1.6.7c.1,0,.2,0,.3,0,2.7-2.7,5.2-4.4,6.7-4.4"/>' +
      '</svg>',
  };
  eleventyConfig.addShortcode("icon", function (name, cls) {
    if (!name) return "";
    const wrap = (svg) => svg.replace("<svg ", `<svg class="ico${cls ? " ico-" + cls : ""}" `);
    if (ICON_CUSTOM[name]) return wrap(ICON_CUSTOM[name]);
    const full = name.endsWith("-" + ICON_STYLE) ? name : name + "-" + ICON_STYLE;
    const data = getIconData(solar, full);
    if (!data) return name; // unknown → pass through (emoji / legacy)
    const built = iconToSVG(data, { height: "1em", width: "1em" });
    return iconToHTML(replaceIDs(built.body), {
      ...built.attributes,
      class: "ico" + (cls ? " ico-" + cls : ""),
    });
  });

  // Hub collections, sorted by an `order` front-matter field.
  const byOrder = (a, b) => (a.data.order || 0) - (b.data.order || 0);
  eleventyConfig.addCollection("vibe", (c) => c.getFilteredByTag("vibe").sort(byOrder));
  eleventyConfig.addCollection("destination", (c) => c.getFilteredByTag("destination").sort(byOrder));
  eleventyConfig.addCollection("insight", (c) => c.getFilteredByTag("insight").sort(byOrder));

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
};
