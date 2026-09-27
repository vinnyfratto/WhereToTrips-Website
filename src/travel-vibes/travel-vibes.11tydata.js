// Meta description for each Travel Vibe leaf, so none falls back to the
// site-wide sentence (they all did, which Google reads as duplicate pages).
// Built from the page's own fields: summary, the sample destinations and the
// headline of the budget line. A `description` in front matter still wins.
module.exports = {
  eleventyComputed: {
    autoDescription: (d) => {
      const names = (d.destinations || []).map((x) => x.name).slice(0, 4);
      const budget = String(d.budget || "").split(/, | — /)[0].trim();
      return [
        d.summary,
        names.length ? `Where to go: ${names.join("; ")}.` : "",
        budget ? `Typical budget: ${budget}.` : "",
      ].filter(Boolean).join(" ");
    },
  },
};
