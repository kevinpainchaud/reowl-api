const Crawler = require("crawler");
const OwlWebsiteCrawler = require("../../../lib/owl-website-crawler");
const casts = require("../../../data/casts");

module.exports = async (req, res) => {
  let match = {};
  const cast = casts.find((cast) => cast.slug === req.query.cast);

  if (cast) {
    match = await OwlWebsiteCrawler.getMatch(Crawler, cast, req.query.id);
  }

  res.setHeader("Cache-Control", "s-maxage=1, stale-while-revalidate=3600");
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(match));
};
