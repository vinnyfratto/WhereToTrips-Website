// One timestamp per build, memoised so everything that stamps a cache-busting
// ?v= — templates AND the import rewriter in .eleventy.js — agrees on it.
let stamp = null;
module.exports = () => (stamp === null ? (stamp = Date.now()) : stamp);
