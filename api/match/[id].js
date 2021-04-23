const Crawler = require("crawler");
const OwlWebsiteCrawler = require("../../lib/owl-website-crawler");

module.exports = async (req, res) => {
  let match = await OwlWebsiteCrawler.getMatch(Crawler, req.query.id);

  res.setHeader("Cache-Control", "max-age=0, s-maxage=259200");
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(match));
};
