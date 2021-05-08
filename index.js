import { Router } from "worktop";
import * as Cache from "worktop/cache";
import OwlWebsiteCrawler from "./lib/owl-website-crawler";

const API = new Router();

API.add("GET", "/matches", async (req, res) => {
  const query = Object.fromEntries(req.query);

  const matches = await OwlWebsiteCrawler.getMatches(
    query.limit,
    query.exclude
  );

  res.send(200, matches);
});

API.add("GET", "/matches/:id", async (req, res) => {
  const match = await OwlWebsiteCrawler.getMatch(req.params.id);

  res.setHeader("Cache-Control", "public, max-age=259200");
  res.send(200, match);
});

Cache.listen(API.run);
