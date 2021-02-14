const Crawler = require("crawler");
const OwlWebsiteCrawler = require("../lib/owl-website-crawler");
const allowedCasts = require("../data/casts");

module.exports = async (req, res) => {
  const matches = await OwlWebsiteCrawler.getMatches(
    Crawler,
    req.query.casts
      ? allowedCasts.filter((cast) => req.query.casts.split(",").includes(cast))
      : allowedCasts,
    req.query.limit,
    req.query.exclude
  );

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(matches));
};
