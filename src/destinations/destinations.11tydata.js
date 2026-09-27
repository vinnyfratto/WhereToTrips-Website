// Meta description for each curated list: its tagline plus the places on it,
// instead of the site-wide fallback. A `description` in front matter still wins.
module.exports = {
  eleventyComputed: {
    autoDescription: (d) => {
      const names = (d.picks || []).map((x) => x.name);
      return [d.tagline || d.summary, names.length ? `The picks: ${names.join("; ")}.` : ""]
        .filter(Boolean).join(" ");
    },
  },
};
