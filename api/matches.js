const OwlWebsiteCrawler = require("../lib/owl-website-crawler");
const casts = require("../data/casts");

module.exports = async (req, res) => {
  const matches = await OwlWebsiteCrawler.getMatches(casts, 10);

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(matches));
};
