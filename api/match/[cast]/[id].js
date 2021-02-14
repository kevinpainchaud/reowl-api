const Crawler = require("crawler");
const OwlWebsiteCrawler = require("../../../lib/owl-website-crawler");
const casts = require("../../../data/casts");

module.exports = async (req, res) => {
  let match = {};

  if (casts.includes(req.query.cast)) {
    match = await OwlWebsiteCrawler.getMatch(
      Crawler,
      req.query.cast,
      req.query.id
    );
  }

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(match));
};
