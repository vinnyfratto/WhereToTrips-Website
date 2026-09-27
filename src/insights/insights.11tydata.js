// Meta description for each post: its hub-card summary, instead of the
// site-wide fallback. A `description` in front matter still wins.
module.exports = {
  eleventyComputed: {
    autoDescription: (d) => d.summary || "",
  },
};
