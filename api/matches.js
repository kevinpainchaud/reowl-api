const Crawler = require("crawler");
const OwlWebsiteCrawler = require("../lib/owl-website-crawler");

module.exports = async (req, res) => {
  const matches = await OwlWebsiteCrawler.getMatches(
    Crawler,
    req.query.limit,
    req.query.exclude
  );

  res.setHeader("Cache-Control", "s-maxage=1, stale-while-revalidate=59");
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(matches));
};
