module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/media");
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/.nojekyll");
  eleventyConfig.addPassthroughCopy("src/vibes-engine");

  // Admin is copied verbatim (Sveltia CMS) — keep it out of template processing.
  eleventyConfig.ignores.add("src/admin/**");

  // Vibes Engine is an internal tool — copy it verbatim, but keep it out of
  // collections/sitemap so it isn't advertised to search/AI crawlers.
  eleventyConfig.ignores.add("src/vibes-engine/**");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
};
