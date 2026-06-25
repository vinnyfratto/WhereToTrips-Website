module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/media");
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/.nojekyll");
  eleventyConfig.addPassthroughCopy("src/vibes-engine");

  // Admin is copied verbatim (Sveltia CMS) — keep it out of template processing.
  eleventyConfig.ignores.add("src/admin/**");

  // Vibes Engine is an internal tool — copy it verbatim, but keep it out of
  // collections/sitemap so it isn't advertised to search/AI crawlers.
  eleventyConfig.ignores.add("src/vibes-engine/**");

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
